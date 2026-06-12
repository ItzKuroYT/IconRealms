const IconRealmsConfig = {
  brand: {
    name: "IconRealms",
    serverAddress: "icongen.minehut.gg",
    minecraftVersion: "1.20+",
    logo: "assets/icon.png",
    favicon: "assets/icon.png",
    lightBanner: "assets/banner-lightmode.png",
    darkBanner: "assets/banner-darkmode.png",
    tebexUrl: "https://icongens.tebex.io"
  },
  api: {
    // GitHub Pages has no serverless functions, so it should call the Vercel API.
    // Localhost still uses the local dev server API automatically.
    baseUrl: "https://icon-realms.vercel.app"
  },
  administrators: ["TheStickBoy", "ItzKuro_", "ItsBurb_"],
  discord: {
    guildId: "1457983897936855199",
    theme: "dark"
  },
  nav: [
    ["Home", "home/"],
    ["News", "news/"],
    ["Forums", "forums/"],
    ["Gamemodes", "gamemodes/"],
    ["Community", "community/"],
    ["Staff", "staff/"],
    ["Supporters", "supporters/"],
    ["Store", "store/"]
  ],
  home: {
    kicker: "Landing pad",
    welcome: "WELCOME TO ICONREALMS!",
    headline: "A New Adventure Awaits",
    intro: "Explore custom game modes, collect unique rewards, level up your journey, and create your own story on IconRealms."
  },
  supporters: {
    title: "Supporters",
    intro: "Thank you to the players helping IconRealms grow.",
    podium: [
      { username: "iSkiiX", spent: "177.31 USD" },
      { username: "XxANIExX", spent: "166.41 USD" },
      { username: "Carrotts4all", spent: "76.92 USD" }
    ],
    customersTitle: "Here's some of our other customers",
    customers: [
      "Prutorm",
      "Ryan_cat_lover",
      "RakeAMake4",
      "LaMamanDreed",
      "DiegoooCS",
      "Phasha",
      "WreckingShark",
      "Rewnsot1",
      "SirFire96",
      "TroyCast",
      "Speedy9815",
      "Mercssses",
      "KaraToga",
      "CalCaroots",
      "XantisDK",
      "InfectedZomWolf",
      "Username_20",
      "AwesomedivxFTW",
      "qc3r",
      "AmyLovesCoffee",
      "ITzOV3R",
      "vAngels_",
      "Szkocja_",
      "WobbIed",
      "KiJuBeDumb"
    ]
  },
  gamemodes: [
    {
      id: "icongens",
      name: "IconGens",
      tag: "Released",
      description: "Farming and gens.",
      serverName: "icongen.minehut.gg",
      ip: "icongen.minehut.gg"
    },
    {
      id: "iconsmash",
      name: "IconSmash",
      tag: "In planning",
      description: "Gens and mace PvP.",
      serverName: "IconSmash",
      ip: "play.iconrealms.net"
    },
    {
      id: "iconkits",
      name: "IconKits",
      tag: "In planning",
      description: "Randomkit PvP.",
      serverName: "IconKits",
      ip: "play.iconrealms.net"
    },
    {
      id: "iconsmp",
      name: "IconSmp",
      tag: "In planning",
      description: "Minecraft survival server.",
      serverName: "IconSmp",
      ip: "play.iconrealms.net"
    },
    {
      id: "icongamez",
      name: "IconGamez",
      tag: "Conceptual planning",
      description: "Minigames like Hypixel.",
      serverName: "IconGamez",
      ip: "play.iconrealms.net"
    }
  ],
  profileStats: [
    { key: "prestige", label: "Prestige", gamemodeId: "icongens" },
    { key: "multiplier", label: "Multiplier", gamemodeId: "icongens" },
    { key: "balance", label: "Balance", gamemodeId: "icongens" },
    { key: "genSlots", label: "Gen Slots", gamemodeId: "icongens" },
    { key: "credits", label: "Credits", gamemodeId: "icongens" },
    { key: "kills", label: "Kills", gamemodeId: "icongens" },
    { key: "deaths", label: "Deaths", gamemodeId: "icongens" },
    { key: "ac", label: "AC", gamemodeId: "icongens" },
    { key: "fc", label: "FC", gamemodeId: "icongens" },
    { key: "mc", label: "MC", gamemodeId: "icongens" }
  ],
  staffRanks: [
    ["Owner", "#ff0000"],
    ["Manager", "#f97316"],
    ["Lead Developer", "#ff7ab8"],
    ["Developer", "#ff4fa3"],
    ["Lead Builder", "#e58a2f"],
    ["Builder", "#cc6f00"],
    ["Sr Admin", "#ff1f1f"],
    ["Admin", "#ff1f1f"],
    ["Jr Admin", "#ff4f7b"],
    ["Sr Mod", "#8e44ad"],
    ["Mod", "#b084cc"],
    ["Jr Mod", "#c8a2d8"],
    ["Helper", "#39ff5a"],
    ["Trainee", "#20e6e6"]

  ],
  defaultStaff: [
    { username: "ItzKuro_", rank: "Owner", bio: "", friends: [] },
    { username: "TheStickBoy", rank: "Owner", bio: "", friends: [] },
    { username: "ItsBurb_", rank: "Manager", bio: "", friends: [] },
    { username: "FireAngel18", rank: "Lead Developer", bio: "", friends: [] },
    { username: "Prutorm", rank: "Developer", bio: "", friends: [] },
    { username: "TyllerTheGamer", rank: "Developer", bio: "", friends: [] },
    { username: "OtterMC_YT", rank: "Developer", bio: "", friends: [] },
    { username: "Noobie_LOL", rank: "Sr Admin", bio: "", friends: [] },
    { username: "szvocja_", rank: "Jr Admin", bio: "", friends: [] },
    { username: "WreckingShark", rank: "Sr Mod", bio: "", friends: [] },
    { username: "TroyCast", rank: "Mod", bio: "", friends: [] },
    { username: "Japans2good", rank: "Mod", bio: "", friends: [] },
    { username: "Carrotts4all", rank: "Lead Builder", bio: "", friends: [] }
  ],
  forumCategories: [
    { id: "news", name: "News" },
    { id: "gamemodes", name: "Gamemodes" },
    { id: "community", name: "Community" }
  ],
  forumBoards: [
    { id: "announcements", categoryId: "news", name: "Announcements", description: "Official announcement posts", locked: true },
    { id: "newsletter", categoryId: "news", name: "Newsletter", description: "Official newletter posts", locked: true },
    { id: "rules", categoryId: "news", name: "Rules", description: "Server and community rules", locked: true },
    { id: "icongens", categoryId: "gamemodes", name: "IconGens", description: "Farming and gens discussion", locked: false },
    { id: "iconsmash", categoryId: "gamemodes", name: "IconSmash", description: "Gens and mace PvP planning", locked: false },
    { id: "iconkits", categoryId: "gamemodes", name: "IconKits", description: "Randomkit PvP planning", locked: false },
    { id: "iconsmp", categoryId: "gamemodes", name: "IconSmp", description: "Survival server planning", locked: false },
    { id: "icongamez", categoryId: "gamemodes", name: "IconGamez", description: "Minigames concept planning", locked: false },
    { id: "general", categoryId: "community", name: "General", description: "Talk about anything server related", locked: false },
    { id: "media", categoryId: "community", name: "Media", description: "Share your IconRealms media", locked: false },
    { id: "suggestions", categoryId: "community", name: "Suggestions", description: "Discuss ideas for IconRealms", locked: false }
  ]
};

if (typeof window !== "undefined") window.IconRealmsConfig = IconRealmsConfig;
if (typeof module !== "undefined") module.exports = IconRealmsConfig;
