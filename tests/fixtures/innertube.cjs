// Hand-written InnerTube answers (WEB_REMIX, logged out), in the shapes YouTube Music returns and the app's
// parsers read (YouTubeCatalog.kt, OfficialMusicParser.kt): only the fields those parsers look at, built
// with small helpers so each case stays readable. Ids are made up; no live call is ever made by the tests.
'use strict';

const ARTIST = 'MUSIC_PAGE_TYPE_ARTIST', ALBUM = 'MUSIC_PAGE_TYPE_ALBUM', CHANNEL = 'MUSIC_PAGE_TYPE_USER_CHANNEL';
const ATV = 'MUSIC_VIDEO_TYPE_ATV', OMV = 'MUSIC_VIDEO_TYPE_OMV', UGC = 'MUSIC_VIDEO_TYPE_UGC';

const DAFT = 'UCkvTestDaftPunk000000aa';
const JUSTICE = 'UCkvTestJustice00000000b';
const DISCOVERY = 'MPREkvTestDiscovery01';
const HOMEWORK = 'MPREkvTestHomework001';

function browse(id, page) {
  return { browseEndpoint: { browseId: id, browseEndpointContextSupportedConfigs: { browseEndpointContextMusicConfig: { pageType: page } } } };
}
function watch(videoId, type, extra) {
  return { watchEndpoint: Object.assign({ videoId, watchEndpointMusicSupportedConfigs: { watchEndpointMusicConfig: { musicVideoType: type } } }, extra || {}) };
}
function run(text, nav) { return nav ? { text, navigationEndpoint: nav } : { text }; }
const dot = run(' • ');
function thumbs(base, sizes) {
  return { musicThumbnailRenderer: { thumbnail: { thumbnails: sizes.map((w) => ({ url: base + '=w' + w + '-h' + w, width: w, height: w })) } } };
}
function flex(runs) { return { musicResponsiveListItemFlexColumnRenderer: { text: { runs } } }; }
function fixed(text) { return { musicResponsiveListItemFixedColumnRenderer: { text: { runs: [run(text)] } } }; }
function overlay(videoId, type) {
  return { musicItemThumbnailOverlayRenderer: { content: { musicPlayButtonRenderer: { playNavigationEndpoint: watch(videoId, type) } } } };
}
function row(o) { return { musicResponsiveListItemRenderer: o }; }
function shelf(title, contents) { return { musicShelfRenderer: { title: { runs: [run(title)] }, contents } }; }
function searchPage(sections) {
  return { contents: { tabbedSearchResultsRenderer: { tabs: [{ tabRenderer: { content: { sectionListRenderer: { contents: sections } } } }] } } };
}
function twoRow(title, subtitleRuns, nav, cover) {
  return { musicTwoRowItemRenderer: { title: { runs: [run(title)] }, subtitle: { runs: subtitleRuns }, navigationEndpoint: nav,
    thumbnailRenderer: thumbs(cover, [226, 544]) } };
}
function carousel(title, items) {
  return { musicCarouselShelfRenderer: { header: { musicCarouselShelfBasicHeaderRenderer: { title: { runs: [run(title)] } } }, contents: items } };
}

/** A song row of a search filtered on songs: title (watch ATV), « Artist • Album • 5:20 ». */
function songRow(videoId, title, album, albumId, duration, o) {
  o = o || {};
  const r = {
    flexColumns: [
      flex([run(title, watch(videoId, o.type || ATV))]),
      flex([run('Daft Punk', browse(DAFT, ARTIST)), dot, run(album, browse(albumId, ALBUM)), dot, run(duration)])
    ],
    thumbnail: thumbs('https://lh3.googleusercontent.com/kvtest-' + videoId, [60, 120]),
    playlistItemData: { videoId: o.declared || videoId }
  };
  if (o.explicit) r.badges = [{ musicInlineBadgeRenderer: { icon: { iconType: 'MUSIC_EXPLICIT_BADGE' } } }];
  return row(r);
}

const searchSongs = searchPage([shelf('Titres', [
  songRow('kvTestOMT01', 'One More Time', 'Discovery', DISCOVERY, '5:20'),
  songRow('kvTestOMT02', 'One More Time (Nightcore)', 'Discovery', DISCOVERY, '3:58'),
  songRow('kvTestATW01', 'Around the World', 'Homework', HOMEWORK, '7:09', { type: OMV }),
  // Plain text metadata: the menu's « Go to artist » / « Go to album » still name them.
  row({
    flexColumns: [flex([run('Da Funk', watch('kvTestDaF01', ATV))]), flex([run('Daft Punk • Homework • 5:28')])],
    menu: { menuRenderer: { items: [
      { menuNavigationItemRenderer: { icon: { iconType: 'MIX' }, navigationEndpoint: watch('kvTestDaF01', ATV) } },
      { menuNavigationItemRenderer: { icon: { iconType: 'ALBUM' }, navigationEndpoint: browse(HOMEWORK, ALBUM) } },
      { menuNavigationItemRenderer: { icon: { iconType: 'ARTIST' }, navigationEndpoint: browse(DAFT, ARTIST) } }
    ] } },
    playlistItemData: { videoId: 'kvTestDaF01' }
  }),
  songRow('kvTestBad01', 'Mismatched', 'Discovery', DISCOVERY, '3:00', { declared: 'kvTestOther' }),
  songRow('kvTestDLv01', 'Digital Love', 'Discovery', DISCOVERY, '4:58', { explicit: true }),
  songRow('kvTestOMT01', 'One More Time', 'Discovery', DISCOVERY, '5:20')
])]);

const searchArtists = searchPage([shelf('Artistes', [
  row({ navigationEndpoint: browse(DAFT, ARTIST), flexColumns: [flex([run('Daft Punk')]), flex([run('Artiste'), dot, run('12 M auditeurs/mois')])],
    thumbnail: thumbs('https://lh3.googleusercontent.com/kvtest-daft', [60, 120, 544]) }),
  row({ navigationEndpoint: browse('UCkvTestSomeProfile0000c', CHANNEL), flexColumns: [flex([run('Daft Fan')]), flex([run('Profil')])] }),
  row({ navigationEndpoint: browse(JUSTICE, ARTIST), flexColumns: [flex([run('Justice')])] })
])]);

const searchPlain = searchPage([
  { musicCardShelfRenderer: { title: { runs: [run('Daft Punk', browse(DAFT, ARTIST))] }, thumbnail: thumbs('https://lh3.googleusercontent.com/kvtest-daft', [226, 544]) } },
  shelf('Albums', [
    row({ navigationEndpoint: browse(DISCOVERY, ALBUM), flexColumns: [flex([run('Discovery')]), flex([run('Album'), dot, run('Daft Punk', browse(DAFT, ARTIST)), dot, run('2001')])],
      thumbnail: thumbs('https://lh3.googleusercontent.com/kvtest-discovery', [60, 226]) }),
    row({ navigationEndpoint: browse('MPREkvTestGetLucky01', ALBUM), flexColumns: [flex([run('Get Lucky')]), flex([run('Single'), dot, run('Daft Punk', browse(DAFT, ARTIST)), dot, run('2013')])] })
  ]),
  shelf('Vidéos', [
    row({ flexColumns: [flex([run('One More Time (Official Video)')]), flex([run('Vidéo'), dot, run('Daft Punk', browse(DAFT, ARTIST)), dot, run('600 M de vues')])],
      overlay: overlay('kvTestOMTv1', OMV) }),
    row({ flexColumns: [flex([run('A podcast about robots')])], overlay: overlay('kvTestPod01', 'MUSIC_VIDEO_TYPE_PODCAST_EPISODE') })
  ])
]);

/** An artist page as a residential connection gets it: header, titles, albums, singles, close artists. */
const artistFull = {
  header: { musicImmersiveHeaderRenderer: {
    title: { runs: [run('Daft Punk')] },
    thumbnail: { musicThumbnailRenderer: { thumbnail: { thumbnails: [
      { url: 'https://lh3.googleusercontent.com/kvtest-daft-wide=w1440-h600', width: 1440, height: 600 },
      { url: 'https://lh3.googleusercontent.com/kvtest-daft-square=w540-h540', width: 540, height: 540 }
    ] } } },
    monthlyListenerCount: { runs: [run('12,3 M auditeurs mensuels')] }
  } },
  contents: { singleColumnBrowseResultsRenderer: { tabs: [{ tabRenderer: { content: { sectionListRenderer: { contents: [
    shelf('Titres', [
      row({ flexColumns: [flex([run('Get Lucky', watch('kvTestGLk01', ATV))]), flex([run('Daft Punk', browse(DAFT, ARTIST)), run(', '), run('Pharrell Williams', browse('UCkvTestPharrell0000000d', ARTIST))]),
        flex([run('1,2 Md de lectures')]), flex([run('Random Access Memories', browse('MPREkvTestRAM000001', ALBUM))])],
        thumbnail: thumbs('https://lh3.googleusercontent.com/kvtest-ram', [60, 120]) }),
      row({ flexColumns: [flex([run('Instant Crush (instrumental)', watch('kvTestIns01', ATV))])] }),
      row({ flexColumns: [flex([run('Around the World', watch('kvTestATW01', OMV))]), flex([run('Daft Punk', browse(DAFT, ARTIST))])] })
    ]),
    carousel('Albums', [
      twoRow('Discovery', [run('Album'), dot, run('2001')], browse(DISCOVERY, ALBUM), 'https://lh3.googleusercontent.com/kvtest-discovery'),
      twoRow('Homework', [run('1997')], browse(HOMEWORK, ALBUM), 'https://lh3.googleusercontent.com/kvtest-homework')
    ]),
    carousel('Singles et EP', [
      twoRow('Get Lucky', [run('Single'), dot, run('2013')], browse('MPREkvTestGetLucky01', ALBUM), 'https://lh3.googleusercontent.com/kvtest-gl'),
      twoRow('Random Remixes', [run('EP'), dot, run('2014')], browse('MPREkvTestRemixEP01', ALBUM), 'https://lh3.googleusercontent.com/kvtest-ep')
    ]),
    carousel('Les fans aiment aussi', [
      twoRow('Justice', [run('8 M abonnés')], browse(JUSTICE, ARTIST), 'https://lh3.googleusercontent.com/kvtest-justice'),
      twoRow('Daft Punk', [run('self')], browse(DAFT, ARTIST), 'https://lh3.googleusercontent.com/kvtest-daft')
    ]),
    { musicDescriptionShelfRenderer: { header: { runs: [run('À propos')] }, description: { runs: [run('Duo français de musique électronique.')] } } }
  ] } } } }] } }
};

/** The same page as some connections get it: only videos, concerts and playlists (no titles, no albums). */
const artistVideosOnly = {
  header: { musicImmersiveHeaderRenderer: { title: { runs: [run('Daft Punk')] },
    thumbnail: { musicThumbnailRenderer: { thumbnail: { thumbnails: [{ url: 'https://lh3.googleusercontent.com/kvtest-daft-wide=w1440-h600', width: 1440, height: 600 }] } } },
    subscriptionButton: { subscribeButtonRenderer: { subscriberCountText: { runs: [run('7,22 M')] } } } } },
  contents: { singleColumnBrowseResultsRenderer: { tabs: [{ tabRenderer: { content: { sectionListRenderer: { contents: [
    carousel('Vidéos', [
      twoRow('Daft Punk - One More Time (Official Video)', [run('Daft Punk', browse(DAFT, ARTIST)), dot, run('625 M de vues')], watch('kvTestOMTv1', OMV), 'https://i.ytimg.com/vi/kvTestOMTv1/hq'),
      twoRow('Fan edit', [run('Someone')], watch('kvTestUgc01', UGC), 'https://i.ytimg.com/vi/kvTestUgc01/hq')
    ]),
    carousel('Playlists de Daft Punk', [
      twoRow('Daft Punk Essentials', [run('Playlist')], browse('VLPLkvTestEssentials', 'MUSIC_PAGE_TYPE_PLAYLIST'), 'https://lh3.googleusercontent.com/kvtest-pl')
    ])
  ] } } } }] } }
};

/** An album page: responsive header, then rows whose title carries no link (the play overlay does). */
function albumRow(videoId, title, duration) {
  return row({ flexColumns: [flex([run(title)]), flex([])], fixedColumns: [fixed(duration)], overlay: overlay(videoId, ATV),
    playlistItemData: { videoId } });
}
const album = {
  contents: { twoColumnBrowseResultsRenderer: {
    tabs: [{ tabRenderer: { content: { sectionListRenderer: { contents: [{ musicResponsiveHeaderRenderer: {
      title: { runs: [run('Discovery')] },
      subtitle: { runs: [run('Album'), dot, run('2001')] },
      straplineTextOne: { runs: [run('Daft Punk', browse(DAFT, ARTIST))] },
      thumbnail: thumbs('https://lh3.googleusercontent.com/kvtest-discovery', [226, 544])
    } }] } } } }],
    secondaryContents: { sectionListRenderer: { contents: [shelf('', [
      albumRow('kvTestOMT01', 'One More Time', '5:20'),
      albumRow('kvTestAer01', 'Aerodynamic', '3:27'),
      albumRow('kvTestDLv01', 'Digital Love', '4:58'),
      row({ flexColumns: [flex([run('Unavailable')])] })
    ])] } }
  } }
};

/** The « next » panel of RDAMVM<seed>: the seed (not first here), an official video, a podcast, a repeat. */
function panel(videoId, title, byline, length, type) {
  return { playlistPanelVideoRenderer: { videoId, title: { runs: [run(title)] }, longBylineText: { runs: byline },
    shortBylineText: { runs: [byline[0]] }, lengthText: { runs: [run(length)] },
    thumbnail: { thumbnails: [{ url: 'https://i.ytimg.com/vi/' + videoId + '/sd', width: 640, height: 480 }] },
    navigationEndpoint: watch(videoId, type, { playlistId: 'RDAMVMkvTestOMT01' }) } };
}
const next = {
  contents: { singleColumnMusicWatchNextResultsRenderer: { tabbedRenderer: { watchNextTabbedResultsRenderer: { tabs: [{ tabRenderer: { content: { musicQueueRenderer: { content: { playlistPanelRenderer: { contents: [
    panel('kvTestVQo01', 'Daft Punk - Veridis Quo (Official Video)', [run('Daft Punk', browse('UCkvTestDaftChannel000e', CHANNEL)), dot, run('39 M de vues')], '6:47', UGC),
    panel('kvTestOMT01', 'One More Time', [run('Daft Punk', browse(DAFT, ARTIST)), dot, run('Discovery', browse(DISCOVERY, ALBUM)), dot, run('2001')], '5:20', ATV),
    panel('kvTestPod01', 'Robots, a podcast', [run('Someone')], '58:00', 'MUSIC_VIDEO_TYPE_PODCAST_EPISODE'),
    panel('kvTestJus01', 'D.A.N.C.E.', [run('Justice', browse(JUSTICE, ARTIST)), dot, run('†', browse('MPREkvTestCross0001', ALBUM)), dot, run('2007')], '4:02', ATV),
    panel('kvTestVQo01', 'Daft Punk - Veridis Quo (Official Video)', [run('Daft Punk')], '6:47', UGC)
  ] } } } } } }] } } } }
};

module.exports = { DAFT, JUSTICE, DISCOVERY, HOMEWORK, searchSongs, searchArtists, searchPlain, artistFull, artistVideosOnly, album, next };
