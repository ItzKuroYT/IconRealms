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
    ["Supporters", "supporters.html"],
    ["Store", "store.html"]
  ],
  home: {
    welcome: "Placeholder",
    headline: "Placeholder",
    intro: "Placeholder"
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
    { username: "OwnershipPlaceholder", rank: "Ownership", bio: "Placeholder staff profile.", friends: [] },
    { username: "ManagerPlaceholder", rank: "Manager", bio: "Placeholder staff profile.", friends: [] },
    { username: "LeadDevPlaceholder", rank: "Lead Developer", bio: "Placeholder staff profile.", friends: [] },
    { username: "DeveloperPlaceholder", rank: "Developer", bio: "Placeholder staff profile.", friends: [] },
    { username: "SeniorAdminPlaceholder", rank: "Senior Administrator", bio: "Placeholder staff profile.", friends: [] },
    { username: "AdminPlaceholder", rank: "Administrator", bio: "Placeholder staff profile.", friends: [] },
    { username: "JuniorAdminPlaceholder", rank: "Junior Administrator", bio: "Placeholder staff profile.", friends: [] },
    { username: "SeniorModPlaceholder", rank: "Senior Moderator", bio: "Placeholder staff profile.", friends: [] },
    { username: "ModPlaceholder", rank: "Moderator", bio: "Placeholder staff profile.", friends: [] },
    { username: "JuniorModPlaceholder", rank: "Junior Moderator", bio: "Placeholder staff profile.", friends: [] },
    { username: "HelperPlaceholder", rank: "Helper", bio: "Placeholder staff profile.", friends: [] },
    { username: "TraineePlaceholder", rank: "Trainee", bio: "Placeholder staff profile.", friends: [] },
    { username: "LeadBuilderPlaceholder", rank: "Lead Builder", bio: "Placeholder staff profile.", friends: [] },
    { username: "BuilderPlaceholder", rank: "Builder", bio: "Placeholder staff profile.", friends: [] }
  ],
  forumCategories: [
    { id: "news", name: "News" },
    { id: "gamemodes", name: "Gamemodes" },
    { id: "community", name: "Community" }
  ],
  forumBoards: [
    { id: "announcements", categoryId: "news", name: "Announcements", description: "Official announcement posts", locked: false },
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
