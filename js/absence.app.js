/**
 * ⏳ GEOGRAPHIC BOUND ATTENDANCE MONITOR
 */

function createAbsenceComponent() {
  const card = document.createElement("div");
  card.className = "task-card";
  card.style.padding = "24px";

  card.innerHTML = `
        <h2 style="text-align:center; margin-bottom:12px; font-size: 20px;">Office Check-In System</h2>
        <p id="geo-status" style="text-align:center; font-weight:600; margin-bottom:24px; color:var(--warning); font-size:13px; line-height: 1.4;">Verifying structural presence signatures...</p>
        <button id="btn-checkin" class="action-btn" style="width:100%; padding:14px; font-size:15px; margin-bottom:12px; background-color:var(--success);" disabled>Check In (Arrival)</button>
        <button id="btn-checkout" class="action-btn" style="width:100%; padding:14px; font-size:15px; background-color:var(--border-color); color: var(--text-primary);" disabled>Check Out (Departure)</button>
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
      },
      { enableHighAccuracy: true },
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
        `Attendance protocol [Check-${type.toUpperCase()}] executed cleanly.`,
      );
    } else {
      alert("Attendance state parsing rejection fault.");
    }
  } catch (err) {
    console.error(err);
    alert("Gateway processing transmission break.");
  }
}
