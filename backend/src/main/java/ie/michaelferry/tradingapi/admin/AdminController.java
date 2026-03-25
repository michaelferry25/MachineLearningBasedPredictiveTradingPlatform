package ie.michaelferry.tradingapi.admin;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    // ─── Platform Overview ───

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        return ResponseEntity.ok(adminService.getPlatformStats());
    }

    // ─── User Management ───

    @GetMapping("/users")
    public ResponseEntity<?> getUsers(@RequestParam(required = false) String search) {
        return ResponseEntity.ok(adminService.getAllUsers(search));
    }

    @GetMapping("/users/{id}")
    public ResponseEntity<?> getUserDetail(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(adminService.getUserDetail(id));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PutMapping("/users/{id}/role")
    public ResponseEntity<?> changeRole(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String newRole = body.get("role");
        if (newRole == null || newRole.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "role is required"));
        }
        try {
            return ResponseEntity.ok(adminService.changeUserRole(id, newRole));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid role: " + newRole));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/users/{id}/reset-portfolio")
    public ResponseEntity<?> resetPortfolio(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(adminService.resetUserPortfolio(id));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // ─── Trade Monitor ───

    @GetMapping("/trades")
    public ResponseEntity<?> getTrades(
            @RequestParam(required = false) String symbol,
            @RequestParam(required = false) Integer limit) {
        return ResponseEntity.ok(adminService.getAllTrades(symbol, limit));
    }

    @GetMapping("/trades/volume")
    public ResponseEntity<?> getTradeVolume() {
        return ResponseEntity.ok(adminService.getTradeVolume());
    }

    // ─── Prediction Stats ───

    @GetMapping("/predictions/stats")
    public ResponseEntity<?> getPredictionStats() {
        return ResponseEntity.ok(adminService.getPredictionStats());
    }

    @GetMapping("/predictions/recent")
    public ResponseEntity<?> getRecentPredictions() {
        return ResponseEntity.ok(adminService.getRecentPredictions());
    }

    // ─── System Health ───

    @GetMapping("/system/health")
    public ResponseEntity<?> getSystemHealth() {
        return ResponseEntity.ok(adminService.getSystemHealth());
    }
}
