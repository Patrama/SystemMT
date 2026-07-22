/**
 * ⏳ GEOGRAPHIC BOUND ATTENDANCE MONITOR
 */

function createAbsenceComponent() {
  const card = document.createElement("div");
  card.className = "task-card page-card attendance-card";

  card.innerHTML = `
      <div class="section-header section-header--center">
      <h2 class="page-title">Office Check-In System</h2>
      <p class="page-copy">Location access is verified before attendance actions are enabled.</p>
    </div>
    <p id="geo-status" class="status-text" role="status" aria-live="polite">Verifying structural presence signatures...</p>
      <div class="form-stack" style="margin-top: 20px;">
      <button id="btn-checkin" class="action-btn" type="button" style="background: linear-gradient(135deg, var(--success), var(--accent-secondary));" disabled>Check In (Arrival)</button>
      <button id="btn-checkout" class="action-btn secondary" type="button" disabled>Check Out (Departure)</button>
    </div>
    `;

  const btnIn = card.querySelector("#btn-checkin");
  const btnOut = card.querySelector("#btn-checkout");
  const statusText = card.querySelector("#geo-status");

  if (navigator.geolocation) {
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
        }
      },
      (err) => {
        statusText.innerText =
          "Hardware GPS Query Error. Lock execution barred.";
        statusText.style.color = "var(--warning)";
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

  btnIn.onclick = () => submitAttendance("in");
  btnOut.onclick = () => submitAttendance("out");

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

async function submitAttendance(type) {
  const now = new Date();
  try {
    const payload = {
      action: "checkInOrOut",
      type: type,
      userName: state.user.name,
      date: now.toLocaleDateString(),
      time: now.toLocaleTimeString(),
    };

    const response = await fetch(
      `${window.APP_CONFIG.vercelGatewayUrl}/api/action`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    if (response.ok) {
      alert(
        `Attendance protocol ${state.user.name} [Check-${type.toUpperCase()}] executed cleanly.`,
      );
    } else {
      alert("Attendance state parsing rejection fault.");
    }
  } catch (err) {
    console.error(err);
    alert("Gateway processing transmission break.");
  }
}
