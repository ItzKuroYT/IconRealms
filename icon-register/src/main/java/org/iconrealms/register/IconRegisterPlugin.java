package org.iconrealms.register;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.google.gson.JsonSyntaxException;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.ArrayList;
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

  @Override
  public void onEnable() {
    saveDefaultConfig();
    client = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(getConfig().getInt("request-timeout-seconds", 10)))
        .build();
    if (getCommand("register") != null) {
      getCommand("register").setExecutor(this);
    }
    long period = Math.max(10, getConfig().getInt("heartbeat-seconds", 30)) * 20L;
    heartbeatTask = getServer().getScheduler().scheduleSyncRepeatingTask(this, () ->
        getServer().getScheduler().runTaskAsynchronously(this, this::sendHeartbeat), 40L, period);
  }

  @Override
  public void onDisable() {
    if (heartbeatTask != -1) {
      getServer().getScheduler().cancelTask(heartbeatTask);
    }
    sendHeartbeat();
  }

  @Override
  public boolean onCommand(
      @NotNull CommandSender sender,
      @NotNull Command command,
      @NotNull String label,
      @NotNull String[] args) {
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
      reply(player, ChatColor.RED + "Could not reach the website registration endpoint.");
      getLogger().warning(exception.getMessage());
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

    List<Map<String, String>> players = new ArrayList<>();
    for (Player player : getServer().getOnlinePlayers()) {
      Map<String, String> item = new HashMap<>();
      item.put("username", player.getName());
      item.put("uuid", player.getUniqueId().toString());
      item.put("rank", rankFor(player));
      players.add(item);
    }

    Map<String, Object> payload = new HashMap<>();
    payload.put("serverName", getConfig().getString("server-name", "server"));
    payload.put("players", players);

    HttpRequest request = HttpRequest.newBuilder()
        .uri(URI.create(websiteUrl + "/api/plugin/heartbeat"))
        .timeout(Duration.ofSeconds(getConfig().getInt("request-timeout-seconds", 10)))
        .header("Content-Type", "application/json")
        .header("x-icon-register-secret", secret)
        .POST(HttpRequest.BodyPublishers.ofString(gson.toJson(payload)))
        .build();

    try {
      client.send(request, HttpResponse.BodyHandlers.discarding());
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
