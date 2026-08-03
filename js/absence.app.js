/**
 * ⏳ GEOGRAPHIC BOUND ATTENDANCE MONITOR
 *
 * @format
 */

function createAbsenceComponent() {
  const card = document.createElement("div");
  card.className = "task-card page-card attendance-card";

  // Check if Bypass mode is active for this user
  const isBypassed = Boolean(
    state.user?.bypass ||
    state.user?.Bypass ||
    String(state.user?.bypass).toUpperCase() === "TRUE",
  );

  card.innerHTML = `
    <div class="section-header section-header--center">
      <h2 class="page-title">Office Check-In System</h2>
      <p class="page-copy">Location access is verified before attendance actions are enabled.</p>
    </div>
    <p id="geo-status" class="status-text" role="status" aria-live="polite">Verifying structural presence signatures...</p>
    ${isBypassed ? '<span class="badge badge--success" style="display: block; text-align: center; margin-bottom: 10px;">⚡ Bypass Mode Active</span>' : ""}
    <div class="form-stack" style="margin-top: 20px;">
      <button id="btn-checkin" class="action-btn" type="button" style="background: linear-gradient(135deg, var(--success), var(--accent-secondary));" disabled>Check In (Arrival)</button>
      <button id="btn-checkout" class="action-btn secondary" type="button" disabled>Check Out (Departure)</button>
    </div>
  `;

  const btnIn = card.querySelector("#btn-checkin");
  const btnOut = card.querySelector("#btn-checkout");
  const statusText = card.querySelector("#geo-status");

  // 🚀 INITIAL VERIFICATION ON PAGE LOAD
  if (isBypassed) {
    statusText.innerText = "Location Bypass Active 🔓 Check-In Authorized.";
    statusText.style.color = "var(--success)";
    btnIn.disabled = false;
    btnOut.disabled = false;
  } else if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const distance = calculateHaversineDistance(
          pos.coords.latitude,
          pos.coords.longitude,
          window.APP_CONFIG.officeLocation.latitude,
          window.APP_CONFIG.officeLocation.longitude,
        );

        if (distance <= window.APP_CONFIG.officeLocation.radiusMeters) {
          statusText.innerText =
            "Location Authorized ✅ Inside Office Perimeter.";
          statusText.style.color = "var(--success)";
          btnIn.disabled = false;
          btnOut.disabled = false;
        } else {
          statusText.innerText = `Access Denied ❌ Out of Bounds. Distance: ${distance.toFixed(1)}m from office anchor point.`;
          statusText.style.color = "var(--warning)";
          btnIn.disabled = true;
          btnOut.disabled = true;
        }
      },
      (err) => {
        statusText.innerText =
          "Hardware GPS Query Error. Lock execution barred.";
        statusText.style.color = "var(--warning)";
        btnIn.disabled = true;
        btnOut.disabled = true;
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      },
    );
  } else {
    statusText.innerText =
      "Geofencing Core modules unavailable on this architecture.";
  }

  // 🔐 ATTACH GUARDED CLICK HANDLERS (Sub-Phase 2.1 Integration)
  btnIn.onclick = () => {
    validateLocationAndProceed((coords) => {
      submitAttendance("in", coords);
    });
  };

  btnOut.onclick = () => {
    validateLocationAndProceed((coords) => {
      submitAttendance("out", coords);
    });
  };

  return card;
}

function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

/**
 * 📍 Geolocation Guard
 * Validates location permissions against user bypass state before executing attendance actions.
 */
function validateLocationAndProceed(onSuccess, onError) {
  const userHasBypass = Boolean(
    state.user?.bypass ||
    state.user?.Bypass ||
    String(state.user?.bypass).toUpperCase() === "TRUE",
  );

  // 1. Browser doesn't support Geolocation
  if (!navigator.geolocation) {
    if (userHasBypass) {
      console.warn("Geolocation unsupported, but bypass mode is active.");
      return onSuccess(null);
    }
    alert("❌ Geolocation is not supported by your browser.");
    if (onError) onError("unsupported");
    return;
  }

  // 2. Request current position
  navigator.geolocation.getCurrentPosition(
    (position) => {
      onSuccess({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    },
    (error) => {
      if (userHasBypass) {
        console.warn(
          "Location permission denied, but user is under active Bypass.",
        );
        onSuccess(null);
      } else {
        alert(
          "🔒 Location access denied. You must enable location services to record attendance.",
        );
        if (onError) onError("denied");
      }
    },
    { enableHighAccuracy: true, timeout: 8000 },
  );
}

async function submitAttendance(type, coords = null) {
  const btnIn = document.querySelector("#btn-checkin");
  const btnOut = document.querySelector("#btn-checkout");
  const statusText = document.querySelector("#geo-status");

  // 1. Instantly lock controls to prevent duplicate clicks (Debounce)
  if (btnIn) btnIn.disabled = true;
  if (btnOut) btnOut.disabled = true;

  const originalStatus = statusText ? statusText.innerText : "";
  if (statusText) {
    statusText.innerText = "⏳ Processing attendance transaction...";
    statusText.style.color = "var(--accent-secondary)";
  }

  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();
  const formattedDate = `${day}/${month}/${year}`;
  const formattedTime = now.toLocaleTimeString("en-GB");

  try {
    const payload = {
      action: "checkInOrOut",
      type: type,
      userName: state.user.name,
      date: formattedDate,
      time: formattedTime,
      coordinates: coords,
    };

    const response = await fetch(
      `${window.APP_CONFIG.vercelGatewayUrl}/api/absence`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    const result = await response.json();

    if (response.ok && result.success) {
      alert(
        `Absence [Check-${type.toUpperCase()}] ${state.user.name} successfully recorded at ${formattedTime} on ${formattedDate}.`,
      );
      if (statusText) {
        statusText.innerText = "✅ Attendance recorded successfully.";
        statusText.style.color = "var(--success)";
      }
    } else {
      alert(`⚠️ Request rejected: ${result.message || "Parsing fault."}`);
      if (statusText) {
        statusText.innerText = `❌ ${result.message || "Attendance state parsing rejection fault."}`;
        statusText.style.color = "var(--warning)";
      }
    }
  } catch (err) {
    console.error(err);
    alert("Gateway processing transmission break.");
    if (statusText) {
      statusText.innerText = "❌ Connection failed. Try again.";
      statusText.style.color = "var(--warning)";
    }
  } finally {
    // 2. Cooldown timer: re-enable buttons after 5 seconds
    setTimeout(() => {
      const isBypassed = Boolean(
        state.user?.bypass ||
        state.user?.Bypass ||
        String(state.user?.bypass).toUpperCase() === "TRUE",
      );
      if (btnIn) btnIn.disabled = false;
      if (btnOut) btnOut.disabled = false;
    }, 5000);
  }
}
