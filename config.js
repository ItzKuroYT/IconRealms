const IconRealmsConfig = {
  brand: {
    name: "IconRealms",
    serverAddress: "play.iconrealms.net",
    minecraftVersion: "placeholder",
    logo: "assets/icon.png",
    favicon: "assets/icon.png",
    lightBanner: "banner-lightmode.png",
    darkBanner: "banner-darkmode.png",
    tebexUrl: "https://iconrealms.tebex.io"
  },
  api: {
    // GitHub Pages has no serverless functions, so it should call the Vercel API.
    // Localhost still uses the local dev server API automatically.
    baseUrl: "https://icon-realms.vercel.app"
  },
  administrators: ["TheStickBoy", "ItzKuro_"],
  discord: {
    guildId: "1457983897936855199",
    theme: "dark"
  },
  nav: [
    ["Home", "index.html"],
    ["News", "news.html"],
    ["Forums", "forums.html"],
    ["Gamemodes", "gamemodes.html"],
    ["Community", "community.html"],
    ["Staff", "staff.html"],
    ["Store", "store.html"]
  ],
  home: {
    welcome: "Placeholder",
    headline: "Placeholder",
    intro: "Placeholder"
  },
  gamemodes: [
    {
      name: "IconGens",
      tag: "Released",
      description: "Farming and gens."
    },
    {
      name: "IconSmash",
      tag: "In planning",
      description: "Gens and mace PvP."
    },
    {
      name: "IconKits",
      tag: "In planning",
      description: "Randomkit PvP."
    },
    {
      name: "IconSmp",
      tag: "In planning",
      description: "Minecraft survival server."
    },
    {
      name: "IconGamez",
      tag: "Conceptual planning",
      description: "Minigames like Hypixel."
    }
  ],
  staffRanks: [
    ["Ownership", "#ff0000"],
    ["Manager", "#f97316"],
    ["Lead Developer", "#ff7ab8"],
    ["Developer", "#ff4fa3"],
    ["Senior Administrator", "#ff1f1f"],
    ["Administrator", "#ff1f1f"],
    ["Junior Administrator", "#ff4f7b"],
    ["Senior Moderator", "#8e44ad"],
    ["Moderator", "#b084cc"],
    ["Junior Moderator", "#c8a2d8"],
    ["Helper", "#39ff5a"],
    ["Trainee", "#20e6e6"],
    ["Lead Builder", "#e58a2f"],
    ["Builder", "#cc6f00"]
  ],
  defaultStaff: [
    { username: "ItzKuro_", rank: "Ownership", bio: "", friends: [] },
    { username: "TheStickBoy", rank: "Ownership", bio: "", friends: [] },
    { username: "ItsBurb", rank: "Manager", bio: "", friends: [] },
    { username: "FireAngel18", rank: "Lead Developer", bio: "", friends: [] },
    { username: "Prutorm", rank: "Developer", bio: "", friends: [] },
    { username: "TyllerTheGamer", rank: "Developer", bio: "", friends: [] },
    { username: "OtterMC_YT", rank: "Developer", bio: "", friends: [] },
    { username: "Noobie_LOL", rank: "Senior Administrator", bio: "", friends: [] },
    { username: "7kurz", rank: "Administrator", bio: "", friends: [] },
    { username: "szvecja", rank: "Junior Administrator", bio: "", friends: [] },
    { username: "WreckingShark", rank: "Senior Moderator", bio: "", friends: [] },
    { username: "TroyCast", rank: "Moderator", bio: "", friends: [] },
    { username: "Japan2good", rank: "Moderator", bio: "", friends: [] },
    { username: "JuniorModPlaceholder", rank: "Junior Moderator", bio: "Placeholder staff profile.", friends: [] },
    { username: "Carrotts4all", rank: "Lead Builder", bio: "", friends: [] }
  ],
  forumCategories: [
    { id: "news", name: "News" },
    { id: "gamemodes", name: "Gamemodes" },
    { id: "community", name: "Community" }
  ],
  forumBoards: [
    { id: "announcements", categoryId: "news", name: "Announcements", description: "Official announcement posts", locked: true },
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
