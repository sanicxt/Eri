// Custom YouTube extractor for discord-player.
//
// Strategy:
//   - Use youtubei.js (https://ytjs.dev) directly, bypassing discord-player-youtube.
//   - For SEARCH: use the WEB client (unauthenticated, returns real video IDs).
//   - For STREAM URL: use the ANDROID client and pick the progressive format
//     (itag=18, MP4 audio+video, 360p, ~454kbps). The ANDROID progressive URL
//     is the only YouTube CDN URL that does NOT get IP-bound by YouTube's
//     signature, so ffmpeg/curl on the bot's host can fetch it directly.
//     iOS URLs are IP-locked (403 from a different network); ANDROID adaptive
//     URLs are not exposed at all; WEB URLs require SABR sign-in.
//
// The video URL is the public watch URL; the actual stream URL is fetched at
// stream() time and returned as a string. discord-player then feeds the URL
// to FFmpeg for demuxing.

const { BaseExtractor, Track, Util, QueryType } = require("discord-player");
const { Innertube, ClientType, Platform } = require("youtubei.js");

// Provide a JS evaluator for URL deciphering (used by some clients).
if (!Platform.shim.eval || Platform.shim.eval.toString().indexOf("[native code]") === -1) {
  Platform.shim.eval = async (data) => new Function(data.output)();
}

const YT_URL_REGEX = /^https?:\/\/(?:www\.|m\.|music\.|gaming\.)?(?:youtube\.com|youtu\.be)\//i;
const VIDEO_ID_REGEX = /^[A-Za-z0-9_-]{11}$/;

function extractVideoId(input) {
  if (!input) return null;
  if (VIDEO_ID_REGEX.test(input)) return input;
  try {
    const u = new URL(input);
    // youtu.be/<id>
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.replace(/^\//, "").split("/")[0];
      return VIDEO_ID_REGEX.test(id) ? id : null;
    }
    // youtube.com/watch?v=<id>
    const v = u.searchParams.get("v");
    if (v && VIDEO_ID_REGEX.test(v)) return v;
    // music.youtube.com/watch?v=<id>
    // youtube.com/shorts/<id>
    const m = u.pathname.match(/\/(shorts|embed|v|e)\/([A-Za-z0-9_-]{11})/);
    if (m) return m[2];
  } catch {
    // not a URL
  }
  return null;
}

function formatDuration(seconds) {
  if (!seconds || seconds < 0) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

class YoutubeExtractor extends BaseExtractor {
  static identifier = "com.eri.youtubextractor";
  static priority = 100; // run before the other bundled extractors

  constructor(context, options = {}) {
    super(context, options);
    this.options = options || {};
    this._streamClient = null;
    this._searchClient = null;
    this.protocols = [];
  }

  async activate() {
    // Region is configurable via YOUTUBE_REGION env var; defaults to IN (India).
    // For valid country codes, see ISO 3166-1 alpha-2 (e.g. "US", "GB", "VN", "JP").
    const region = (process.env.YOUTUBE_REGION || "IN").toUpperCase();
    const lang = process.env.YOUTUBE_LANG || "en";
    const timezone = process.env.YOUTUBE_TIMEZONE || (region === "IN" ? "Asia/Kolkata" : "");

    // ANDROID client — returns a usable progressive format (itag=18, MP4 audio+video)
    // whose URL is NOT IP-bound. This is the only client that produces URLs that
    // ffmpeg/curl can fetch from a different IP than youtubei.js's session.
    //   - iOS client: URLs are IP-locked, fail with 403 from a different network
    //   - WEB client: requires SABR sign-in for streaming
    //   - ANDROID progressive (itag=18): works without auth, no IP binding
    this._streamClient = await Innertube.create({
      client_type: ClientType.ANDROID,
      generate_session_locally: true,
      retrieve_player: false,
      cookie: this.options.cookie || undefined,
      location: region,
      lang,
      timezone,
    });
    // WEB client — used for search; unauth searches work fine and return clean
    // video IDs. Streaming on WEB requires SABR sign-in, which we don't want.
    this._searchClient = await Innertube.create({
      client_type: ClientType.WEB,
      generate_session_locally: true,
      retrieve_player: false,
      cookie: this.options.cookie || undefined,
      location: region,
      lang,
      timezone,
    });
    this.protocols = ["ytsearch", "youtube", "youtubeMusic", "youtu.be"];
    this.region = region;
  }

  async deactivate() {
    this._streamClient = null;
    this._searchClient = null;
    this.protocols = [];
  }

  async validate(query) {
    if (!query || typeof query !== "string") return false;
    return extractVideoId(query) !== null || this._looksLikeSearch(query);
  }

  _looksLikeSearch(query) {
    // If it's a recognized URL, validate() returns true via extractVideoId.
    // For anything else, treat as search query. The extractor's search engine
    // mapping in discord-player will only call us for youtube* query types
    // because of how query routing works.
    if (YT_URL_REGEX.test(query)) return true;
    return true; // we'll decide in handle() whether it's a URL or free text
  }

  async handle(query, context) {
    const videoId = extractVideoId(query);

    // Direct URL or video id
    if (videoId) {
      const track = await this._buildTrackFromId(videoId, context);
      if (track) return this.createResponse(null, [track]);
      return this.createResponse(null, []);
    }

    // Free-text search via the WEB client
    const q = String(query || "").trim();
    if (!q) return this.createResponse(null, []);

    let search;
    try {
      search = await this._searchClient.search(q, { type: "video" });
    } catch (err) {
      this.debug(`YT search failed: ${err.message}`);
      return this.createResponse(null, []);
    }

    const videos = (search.results || []).filter((r) => r.type === "Video" && r.id);
    const tracks = [];
    for (const v of videos.slice(0, 10)) {
      const t = await this._buildTrackFromId(v.id, context, {
        titleHint: v.title?.text,
        authorHint: v.author?.name,
        durationHint: v.duration?.seconds,
        thumbnailHint: v.thumbnails?.[0]?.url,
      });
      if (t) tracks.push(t);
    }
    return this.createResponse(null, tracks);
  }

  async _buildTrackFromId(videoId, context, hints = {}) {
    let info;
    try {
      info = await this._streamClient.getBasicInfo(videoId, "VIDEO");
    } catch (err) {
      this.debug(`getBasicInfo(${videoId}) failed: ${err.message}`);
      return null;
    }
    const basic = info?.basic_info;
    if (!basic) return null;

    const title = hints.titleHint || basic.title || "Unknown title";
    const author = hints.authorHint || (basic.author || basic.channel?.name) || "Unknown";
    const durationSec = hints.durationHint ?? basic.duration ?? 0;
    const thumbnails = basic.thumbnail || [];
    const thumbnail = hints.thumbnailHint || (thumbnails[thumbnails.length - 1]?.url) || "";
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;

    const track = new Track(this.context.player, {
      title,
      url: watchUrl,
      duration: formatDuration(durationSec),
      description: basic.short_description || "",
      thumbnail,
      views: basic.view_count || 0,
      author,
      requestedBy: context?.requestedBy || null,
      source: "youtube",
      engine: info,
      queryType: QueryType.YOUTUBE_VIDEO,
      metadata: { videoId, author, durationSec, thumbnail },
      cleanTitle: title,
      live: !!basic.is_live,
    });
    track.extractor = this;
    track.raw = { videoId, info, hints };
    return track;
  }

  async stream(info) {
    const videoId = info?.raw?.videoId || extractVideoId(info?.url);
    if (!videoId) throw new Error("YouTube: missing video id");

    let basic;
    try {
      basic = await this._streamClient.getBasicInfo(videoId, "VIDEO");
    } catch (err) {
      try {
        const full = await this._streamClient.getInfo(videoId);
        basic = full;
      } catch (e2) {
        throw new Error(`YouTube: failed to resolve stream (${err.message || err})`);
      }
    }

    const sd = basic?.streaming_data;
    if (!sd) throw new Error("YouTube: no streaming_data available (likely age/region restricted)");

    // ANDROID client gives us a progressive format (itag=18) with a real,
    // fetchable URL. Pick that — ffmpeg will demux the MP4 and use the
    // audio track. Higher-quality adaptive formats from ANDROID are
    // URL-less and would require the JS player to decipher, which we
    // don't have.
    const progressive = sd.formats || [];
    if (!progressive.length) {
      throw new Error("YouTube: no progressive format (live streams or restricted videos are not supported)");
    }

    // Prefer itag=18 (360p, 454kbps, audio+video) — the most reliable format.
    // If it's missing, fall back to the first progressive format available.
    const chosen =
      progressive.find((f) => f.itag === 18) ||
      progressive.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];

    if (!chosen || !chosen.url) {
      throw new Error("YouTube: progressive format URL not available");
    }

    // discord-player accepts a URL string here; it will pipe it through ffmpeg
    // to decode the MP4 container to raw PCM.
    return chosen.url;
  }

  async getRelatedTracks(track, history) {
    try {
      const videoId = track?.raw?.videoId || extractVideoId(track?.url);
      if (!videoId) return this.createResponse(null, []);
      const related = await this._streamClient.getRelatedVideos(videoId).catch(() => null);
      const items = related?.items || [];
      const tracks = [];
      for (const item of items.slice(0, 5)) {
        const id = item.id;
        if (!id || !VIDEO_ID_REGEX.test(id)) continue;
        const t = await this._buildTrackFromId(id, { requestedBy: null }, {
          titleHint: item.title?.text,
          authorHint: item.author?.name,
          durationHint: item.duration?.seconds,
          thumbnailHint: item.thumbnails?.[0]?.url,
        });
        if (t) tracks.push(t);
      }
      return this.createResponse(null, tracks);
    } catch (err) {
      this.debug(`getRelatedTracks failed: ${err.message}`);
      return this.createResponse(null, []);
    }
  }

  createBridgeQuery(track) {
    const id = track?.raw?.videoId || extractVideoId(track?.url) || "";
    return id ? `https://www.youtube.com/watch?v=${id}` : (track?.url || track?.title || "");
  }
}

module.exports = YoutubeExtractor;
