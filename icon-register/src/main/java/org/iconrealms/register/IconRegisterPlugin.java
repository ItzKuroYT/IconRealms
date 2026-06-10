package org.iconrealms.register;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.google.gson.JsonSyntaxException;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.ArrayList;
import java.util.Properties;
import org.bukkit.ChatColor;
import org.bukkit.command.Command;
import org.bukkit.command.CommandExecutor;
import org.bukkit.command.CommandSender;
import org.bukkit.entity.Player;
import org.bukkit.plugin.java.JavaPlugin;
import org.jetbrains.annotations.NotNull;

public final class IconRegisterPlugin extends JavaPlugin implements CommandExecutor {
  private final Gson gson = new Gson();
  private HttpClient client;
  private int heartbeatTask = -1;
  private long startedAtMillis;
  private long lastApiPingMs = 0L;
  private String lastCrashAt = "";

  @Override
  public void onEnable() {
    startedAtMillis = System.currentTimeMillis();
    saveDefaultConfig();
    loadRuntimeState();
    writeRuntimeState(false);
    client = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(getConfig().getInt("request-timeout-seconds", 10)))
        .build();
    if (getCommand("register") != null) {
      getCommand("register").setExecutor(this);
    }
    if (getCommand("iconregister") != null) {
      getCommand("iconregister").setExecutor(this);
    }
    restartHeartbeat();
  }

  @Override
  public void onDisable() {
    if (heartbeatTask != -1) {
      getServer().getScheduler().cancelTask(heartbeatTask);
    }
    writeRuntimeState(true);
    sendHeartbeat();
  }

  @Override
  public boolean onCommand(
      @NotNull CommandSender sender,
      @NotNull Command command,
      @NotNull String label,
      @NotNull String[] args) {
    if ("iconregister".equalsIgnoreCase(command.getName())) {
      return handleAdminCommand(sender, args);
    }

    if (!(sender instanceof Player player)) {
      sender.sendMessage(ChatColor.RED + "Only players can use this command.");
      return true;
    }
    if (args.length != 2) {
      player.sendMessage(ChatColor.YELLOW + "Usage: /register <email> <password>");
      return true;
    }
    String email = args[0];
    String password = args[1];
    if (!email.contains("@") || password.length() < 8) {
      player.sendMessage(ChatColor.RED + "Use a valid email and a password with at least 8 characters.");
      return true;
    }

    player.sendMessage(ChatColor.GRAY + "Registering your IconRealms website account...");
    getServer().getScheduler().runTaskAsynchronously(this, () -> register(player, email, password));
    return true;
  }

  private boolean handleAdminCommand(CommandSender sender, String[] args) {
    if (args.length != 1 || !"reload".equalsIgnoreCase(args[0])) {
      sender.sendMessage(ChatColor.YELLOW + "Usage: /iconregister reload");
      return true;
    }
    if (!sender.hasPermission("iconregister.admin")) {
      sender.sendMessage(ChatColor.RED + "You do not have permission to use this command.");
      return true;
    }
    reloadConfig();
    client = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(getConfig().getInt("request-timeout-seconds", 10)))
        .build();
    restartHeartbeat();
    sender.sendMessage(ChatColor.GREEN + "icon-register config reloaded.");
    getServer().getScheduler().runTaskAsynchronously(this, this::sendHeartbeat);
    return true;
  }

  private void restartHeartbeat() {
    if (heartbeatTask != -1) {
      getServer().getScheduler().cancelTask(heartbeatTask);
    }
    long period = Math.max(10, getConfig().getInt("heartbeat-seconds", 30)) * 20L;
    heartbeatTask = getServer().getScheduler().scheduleSyncRepeatingTask(this, () ->
        getServer().getScheduler().runTaskAsynchronously(this, this::sendHeartbeat), 20L, period);
  }

  private void register(Player player, String email, String password) {
    String websiteUrl = trimSlash(getConfig().getString("website-url", ""));
    String secret = getConfig().getString("shared-secret", "");
    if (websiteUrl.isBlank() || secret.isBlank() || "change-me".equals(secret)) {
      reply(player, ChatColor.RED + "Registration is not configured yet.");
      return;
    }

    Map<String, String> payload = new HashMap<>();
    payload.put("username", player.getName());
    payload.put("uuid", player.getUniqueId().toString());
    payload.put("email", email);
    payload.put("password", password);
    payload.put("rank", rankFor(player));

    HttpRequest request = HttpRequest.newBuilder()
        .uri(URI.create(websiteUrl + "/api/plugin/register"))
        .timeout(Duration.ofSeconds(getConfig().getInt("request-timeout-seconds", 10)))
        .header("Content-Type", "application/json")
        .header("x-icon-register-secret", secret)
        .POST(HttpRequest.BodyPublishers.ofString(gson.toJson(payload)))
        .build();

    try {
      HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
      if (response.statusCode() >= 200 && response.statusCode() < 300) {
        reply(player, ChatColor.GREEN + "Registered. You can now log in on the website.");
      } else {
        reply(player, ChatColor.RED + "Website registration failed: " + errorMessage(response));
      }
    } catch (IOException exception) {
      String detail = exception.getClass().getSimpleName() + ": " + exception.getMessage();
      reply(player, ChatColor.RED + "Could not reach the website registration endpoint. Check console.");
      getLogger().warning("Registration endpoint failed for " + player.getName() + ": " + detail);
    } catch (InterruptedException exception) {
      Thread.currentThread().interrupt();
      reply(player, ChatColor.RED + "Registration was interrupted.");
    }
  }

  private void reply(Player player, String message) {
    getServer().getScheduler().runTask(this, () -> player.sendMessage(message));
  }

  private void sendHeartbeat() {
    String websiteUrl = trimSlash(getConfig().getString("website-url", ""));
    String secret = getConfig().getString("shared-secret", "");
    if (websiteUrl.isBlank() || secret.isBlank() || "change-me".equals(secret)) {
      return;
    }

    List<Map<String, Object>> players = new ArrayList<>();
    int pingTotal = 0;
    for (Player player : getServer().getOnlinePlayers()) {
      Map<String, Object> item = new HashMap<>();
      int ping = pingFor(player);
      item.put("username", player.getName());
      item.put("uuid", player.getUniqueId().toString());
      item.put("rank", rankFor(player));
      item.put("pingMs", ping);
      pingTotal += Math.max(0, ping);
      players.add(item);
    }

    Map<String, Object> metrics = new HashMap<>();
    metrics.put("tps", tps());
    metrics.put("apiPingMs", lastApiPingMs);
    metrics.put("averagePlayerPingMs", players.isEmpty() ? 0 : Math.round((double) pingTotal / players.size()));
    metrics.put("uptimeMs", System.currentTimeMillis() - startedAtMillis);
    metrics.put("maxPlayers", getServer().getMaxPlayers());
    metrics.put("lastRestartAt", Instant.ofEpochMilli(startedAtMillis).toString());
    metrics.put("lastCrashAt", lastCrashAt);

    Map<String, Object> payload = new HashMap<>();
    payload.put("serverName", getConfig().getString("server-name", "server"));
    payload.put("serverIp", getConfig().getString("server-ip", getConfig().getString("server-name", "server")));
    payload.put("players", players);
    payload.put("metrics", metrics);

    HttpRequest request = HttpRequest.newBuilder()
        .uri(URI.create(websiteUrl + "/api/plugin/heartbeat"))
        .timeout(Duration.ofSeconds(getConfig().getInt("request-timeout-seconds", 10)))
        .header("Content-Type", "application/json")
        .header("x-icon-register-secret", secret)
        .POST(HttpRequest.BodyPublishers.ofString(gson.toJson(payload)))
        .build();

    try {
      long started = System.nanoTime();
      client.send(request, HttpResponse.BodyHandlers.discarding());
      lastApiPingMs = Math.max(1L, Duration.ofNanos(System.nanoTime() - started).toMillis());
    } catch (IOException exception) {
      getLogger().fine("Heartbeat failed: " + exception.getMessage());
    } catch (InterruptedException exception) {
      Thread.currentThread().interrupt();
    }
  }

  private String rankFor(Player player) {
    if (getConfig().isConfigurationSection("rank-permissions")) {
      for (String rank : getConfig().getConfigurationSection("rank-permissions").getKeys(false)) {
        String permission = getConfig().getString("rank-permissions." + rank, "");
        if (permission == null || permission.isBlank()) continue;
        if (player.hasPermission(permission)) return rank;
      }
    }
    return "Member";
  }

  private int pingFor(Player player) {
    try {
      Object value = player.getClass().getMethod("getPing").invoke(player);
      return value instanceof Number number ? number.intValue() : 0;
    } catch (ReflectiveOperationException exception) {
      return 0;
    }
  }

  private double tps() {
    try {
      Object value = getServer().getClass().getMethod("getTPS").invoke(getServer());
      if (value instanceof double[] tpsValues && tpsValues.length > 0) {
        return tpsValues[0];
      }
    } catch (ReflectiveOperationException exception) {
      return -1D;
    }
    return -1D;
  }

  private void loadRuntimeState() {
    File file = runtimeStateFile();
    if (!file.exists()) return;
    Properties properties = new Properties();
    try (FileInputStream input = new FileInputStream(file)) {
      properties.load(input);
      boolean cleanStop = Boolean.parseBoolean(properties.getProperty("clean-stop", "true"));
      if (!cleanStop) {
        lastCrashAt = properties.getProperty("started-at", Instant.now().toString());
      }
    } catch (IOException exception) {
      getLogger().fine("Could not read runtime state: " + exception.getMessage());
    }
  }

  private void writeRuntimeState(boolean cleanStop) {
    getDataFolder().mkdirs();
    Properties properties = new Properties();
    properties.setProperty("clean-stop", Boolean.toString(cleanStop));
    properties.setProperty("started-at", Instant.ofEpochMilli(startedAtMillis).toString());
    try (FileOutputStream output = new FileOutputStream(runtimeStateFile())) {
      properties.store(output, "icon-register runtime state");
    } catch (IOException exception) {
      getLogger().fine("Could not write runtime state: " + exception.getMessage());
    }
  }

  private File runtimeStateFile() {
    return new File(getDataFolder(), "runtime-state.properties");
  }

  private String trimSlash(String value) {
    if (value == null) return "";
    return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
  }

  private String errorMessage(HttpResponse<String> response) {
    try {
      JsonObject json = gson.fromJson(response.body(), JsonObject.class);
      if (json != null && json.has("error")) {
        return json.get("error").getAsString();
      }
    } catch (JsonSyntaxException ignored) {
      // Fall through to the HTTP status fallback.
    }
    return "HTTP " + response.statusCode();
  }
}
