package org.iconrealms.register.velocity;

import com.google.gson.Gson;
import com.google.inject.Inject;
import com.velocitypowered.api.command.SimpleCommand;
import com.velocitypowered.api.event.Subscribe;
import com.velocitypowered.api.event.proxy.ProxyInitializeEvent;
import com.velocitypowered.api.event.proxy.ProxyShutdownEvent;
import com.velocitypowered.api.plugin.Plugin;
import com.velocitypowered.api.proxy.Player;
import com.velocitypowered.api.proxy.ProxyServer;
import com.velocitypowered.api.permission.Tristate;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import net.kyori.adventure.text.Component;
import org.slf4j.Logger;

@Plugin(id = "icon-register", name = "icon-register", version = "1.0.0", authors = {"IconRealms"})
public final class IconRegisterVelocityPlugin {
  private final ProxyServer server;
  private final Logger logger;
  private final Gson gson = new Gson();
  private final HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();

  private String websiteUrl = System.getenv().getOrDefault("ICON_REGISTER_WEBSITE_URL", "");
  private String sharedSecret = System.getenv().getOrDefault("ICON_REGISTER_SHARED_SECRET", "");
  private String serverName = System.getenv().getOrDefault("ICON_REGISTER_SERVER_NAME", "velocity");

  @Inject
  public IconRegisterVelocityPlugin(ProxyServer server, Logger logger) {
    this.server = server;
    this.logger = logger;
  }

  @Subscribe
  public void onProxyInitialize(ProxyInitializeEvent event) {
    server.getCommandManager().register("register", new RegisterCommand(), "webregister");
    server.getScheduler().buildTask(this, this::sendHeartbeat).repeat(30, TimeUnit.SECONDS).schedule();
  }

  @Subscribe
  public void onProxyShutdown(ProxyShutdownEvent event) {
    sendHeartbeat();
  }

  private final class RegisterCommand implements SimpleCommand {
    @Override
    public void execute(Invocation invocation) {
      if (!(invocation.source() instanceof Player player)) {
        invocation.source().sendMessage(Component.text("Only players can use this command."));
        return;
      }
      String[] args = invocation.arguments();
      if (args.length != 2) {
        player.sendMessage(Component.text("Usage: /register <email> <password>"));
        return;
      }
      if (!args[0].contains("@") || args[1].length() < 8) {
        player.sendMessage(Component.text("Use a valid email and a password with at least 8 characters."));
        return;
      }
      server.getScheduler().buildTask(IconRegisterVelocityPlugin.this, () -> register(player, args[0], args[1])).schedule();
    }
  }

  private void register(Player player, String email, String password) {
    if (!configured()) {
      player.sendMessage(Component.text("Registration is not configured yet."));
      return;
    }
    Map<String, String> payload = new HashMap<>();
    payload.put("username", player.getUsername());
    payload.put("uuid", player.getUniqueId().toString());
    payload.put("email", email);
    payload.put("password", password);
    payload.put("rank", rankFor(player));

    HttpRequest request = request("/api/plugin/register", payload);
    try {
      HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
      player.sendMessage(Component.text(response.statusCode() >= 200 && response.statusCode() < 300
          ? "Registered. You can now log in on the website."
          : "Website registration failed: HTTP " + response.statusCode()));
    } catch (IOException exception) {
      player.sendMessage(Component.text("Could not reach the website registration endpoint."));
      logger.warn("Registration failed", exception);
    } catch (InterruptedException exception) {
      Thread.currentThread().interrupt();
      player.sendMessage(Component.text("Registration was interrupted."));
    }
  }

  private void sendHeartbeat() {
    if (!configured()) return;
    List<Map<String, String>> players = new ArrayList<>();
    for (Player player : server.getAllPlayers()) {
      Map<String, String> item = new HashMap<>();
      item.put("username", player.getUsername());
      item.put("uuid", player.getUniqueId().toString());
      item.put("rank", rankFor(player));
      players.add(item);
    }
    Map<String, Object> payload = new HashMap<>();
    payload.put("serverName", serverName);
    payload.put("players", players);
    try {
      client.send(request("/api/plugin/heartbeat", payload), HttpResponse.BodyHandlers.discarding());
    } catch (IOException exception) {
      logger.debug("Heartbeat failed", exception);
    } catch (InterruptedException exception) {
      Thread.currentThread().interrupt();
    }
  }

  private HttpRequest request(String path, Object payload) {
    return HttpRequest.newBuilder()
        .uri(URI.create(trimSlash(websiteUrl) + path))
        .timeout(Duration.ofSeconds(10))
        .header("Content-Type", "application/json")
        .header("x-icon-register-secret", sharedSecret)
        .POST(HttpRequest.BodyPublishers.ofString(gson.toJson(payload)))
        .build();
  }

  private String rankFor(Player player) {
    if (player.getPermissionValue("iconrealms.rank.vipplus") == Tristate.TRUE) return "VIP+";
    if (player.getPermissionValue("iconrealms.rank.vip") == Tristate.TRUE) return "VIP";
    return "Member";
  }

  private boolean configured() {
    return websiteUrl != null && !websiteUrl.isBlank() && sharedSecret != null && !sharedSecret.isBlank();
  }

  private String trimSlash(String value) {
    if (value == null) return "";
    return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
  }
}
