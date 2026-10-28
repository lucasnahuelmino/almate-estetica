function initAdminDashboard() {
  const login = document.getElementById("admin-login");
  if (!login) return;

  const dashboard = document.getElementById("admin-dashboard");
  const loginError = document.getElementById("admin-login-error");
  const pageError = document.getElementById("admin-page-error");
  const calendarWarning = document.getElementById("admin-calendar-warning");
  const calendarStatus = document.getElementById("admin-calendar-status");
  const calendarLink = document.getElementById("admin-google-calendar");
  const grid = document.getElementById("admin-calendar-grid");
  const appointmentList = document.getElementById("admin-appointment-list");
  const dialog = document.getElementById("admin-appointment-dialog");
  const form = document.getElementById("admin-appointment-form");
  const dialogError = document.getElementById("admin-dialog-error");
  const saveButton = document.getElementById("admin-dialog-save");
  const today = new Date();
  let displayedMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  let selectedDate;
  let timeZone = "America/Argentina/Buenos_Aires";
  let appointments = [];
  let summary = { today: 0, pending: 0, week: 0 };
  let csrfToken = "";
  let calendarConnected = false;
  let appointmentAbortController;

  function dateKey(year, month, day) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function todayKey() {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    return `${values.year}-${values.month}-${values.day}`;
  }

  function formatDate(date) {
    const [year, month, day] = date.split("-").map(Number);
    return new Intl.DateTimeFormat("es-AR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone,
    }).format(new Date(Date.UTC(year, month - 1, day, 12)));
  }

  function eventDateKey(value) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date(value));
    const values = Object.fromEntries(parts.map(({ type, value: partValue }) => [type, partValue]));
    return `${values.year}-${values.month}-${values.day}`;
  }

  function eventTime(value) {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(new Date(value));
  }

  function setPageError(message) {
    pageError.textContent = message;
    pageError.hidden = !message;
  }

  async function api(url, options = {}) {
    const headers = new Headers(options.headers || {});
    if (options.body) headers.set("Content-Type", "application/json");
    if (["POST", "PUT", "DELETE"].includes(options.method)) {
      headers.set("X-CSRF-Token", csrfToken);
    }
    const response = await fetch(url, {
      credentials: "same-origin",
      ...options,
      headers,
    });
    if (response.status === 204) return null;
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || "No se pudo completar la solicitud.");
    return body;
  }

  function addServiceOptions(services) {
    const select = document.getElementById("admin-service");
    select.replaceChildren();
    services.forEach(({ name }) => select.add(new Option(name, name)));
  }

  function setCalendarMessage(message, isError = false) {
    calendarStatus.replaceChildren();
    const strong = document.createElement("strong");
    strong.textContent = message;
    calendarStatus.append(strong);
    calendarStatus.hidden = !message;
    calendarStatus.classList.toggle("is-error", isError);
    calendarStatus.classList.toggle("is-connected", !isError && !calendarWarning.hidden);
  }

  function renderStats() {
    document.getElementById("admin-stat-today").textContent = summary.today;
    document.getElementById("admin-stat-pending").textContent = summary.pending;
    document.getElementById("admin-stat-week").textContent = summary.week;
  }

  function appointmentDateLabel(appointment) {
    return `${eventTime(appointment.start_at)} – ${eventTime(appointment.end_at)}`;
  }

  function openDialog(appointment) {
    if (appointment?.external) return;
    form.reset();
    dialogError.hidden = true;
    document.getElementById("admin-appointment-id").value = appointment?.id || "";
    document.getElementById("admin-dialog-title").textContent = appointment ? "Reprogramar turno" : "Agregar turno";
    document.getElementById("admin-client-name").value = appointment?.client_name || "";
    document.getElementById("admin-client-contact").value = appointment?.client_contact || "";
    document.getElementById("admin-service").value = appointment?.service || "";
    document.getElementById("admin-appointment-date").value = appointment
      ? eventDateKey(appointment.start_at)
      : selectedDate;
    document.getElementById("admin-appointment-time").value = appointment
      ? eventTime(appointment.start_at)
      : "09:00";
    document.getElementById("admin-appointment-notes").value = appointment?.notes || "";
    document.getElementById("admin-appointment-status").value = appointment?.status || "confirmed";
    dialog.showModal();
  }

  function renderAppointments() {
    document.getElementById("admin-selected-date").textContent = formatDate(selectedDate);
    appointmentList.replaceChildren();
    const dailyAppointments = appointments
      .filter((appointment) => eventDateKey(appointment.start_at) === selectedDate)
      .sort((first, second) => new Date(first.start_at) - new Date(second.start_at));

    if (!dailyAppointments.length) {
      const empty = document.createElement("p");
      empty.className = "admin-empty-state";
      empty.textContent = "No hay turnos para esta fecha.";
      appointmentList.append(empty);
      return;
    }

    dailyAppointments.forEach((appointment) => {
      const item = document.createElement("article");
      item.className = "admin-appointment";
      if (appointment.status === "cancelled") item.classList.add("is-cancelled");
      const time = document.createElement("time");
      time.className = "admin-appointment__time";
      time.textContent = appointmentDateLabel(appointment);
      const details = document.createElement("div");
      details.className = "admin-appointment__details";
      const name = document.createElement("strong");
      name.textContent = appointment.client_name;
      const service = document.createElement("span");
      service.textContent = appointment.service;
      details.append(name, service);
      if (appointment.client_contact) {
        const contact = document.createElement("span");
        contact.textContent = `Contacto: ${appointment.client_contact}`;
        details.append(contact);
      }
      if (appointment.notes) {
        const notes = document.createElement("span");
        notes.textContent = `Notas: ${appointment.notes}`;
        details.append(notes);
      }
      const status = document.createElement("span");
      status.className = `admin-status admin-status--${appointment.status}`;
      status.textContent = appointment.external
        ? "Google Calendar"
        : appointment.status === "cancelled"
          ? "Cancelado"
        : appointment.status === "pending"
          ? "Pendiente"
          : "Confirmado";
      details.append(status);
      item.append(time, details);

      if (!appointment.external && appointment.status !== "cancelled") {
        const actions = document.createElement("div");
        actions.className = "admin-appointment__actions";
        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "admin-text-button";
        editButton.textContent = "Reprogramar";
        editButton.addEventListener("click", () => openDialog(appointment));
        const cancelButton = document.createElement("button");
        cancelButton.type = "button";
        cancelButton.className = "admin-text-button admin-text-button--danger";
        cancelButton.textContent = "Cancelar turno";
        cancelButton.addEventListener("click", async () => {
          if (!window.confirm(`¿Cancelar el turno de ${appointment.client_name}?`)) return;
          cancelButton.disabled = true;
          try {
            await api(`/api/admin/appointments/${encodeURIComponent(appointment.id)}`, {
              method: "DELETE",
            });
            await loadAppointments();
            setPageError("");
          } catch (error) {
            cancelButton.disabled = false;
            setPageError(error.message);
          }
        });
        actions.append(editButton, cancelButton);
        item.append(actions);
      }
      appointmentList.append(item);
    });
  }

  function renderCalendar() {
    const year = displayedMonth.getFullYear();
    const month = displayedMonth.getMonth();
    document.getElementById("admin-month-label").textContent =
      new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" }).format(displayedMonth);
    grid.replaceChildren();
    ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].forEach((day) => {
      const heading = document.createElement("span");
      heading.className = "admin-calendar-weekday";
      heading.textContent = day;
      grid.append(heading);
    });
    const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let blank = 0; blank < firstWeekday; blank += 1) {
      const placeholder = document.createElement("span");
      placeholder.className = "admin-calendar-empty";
      grid.append(placeholder);
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const key = dateKey(year, month, day);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "admin-calendar-day";
      if (key === todayKey()) button.classList.add("is-today");
      if (key === selectedDate) button.classList.add("is-selected");
      button.setAttribute("aria-label", `${formatDate(key)}${appointments.some((item) => item.status !== "cancelled" && eventDateKey(item.start_at) === key) ? ", con turnos" : ""}`);
      button.textContent = day;
      if (appointments.some((item) => item.status !== "cancelled" && eventDateKey(item.start_at) === key)) {
        const marker = document.createElement("span");
        marker.className = "admin-calendar-marker";
        marker.setAttribute("aria-hidden", "true");
        button.append(marker);
      }
      button.addEventListener("click", () => {
        selectedDate = key;
        renderCalendar();
        renderAppointments();
      });
      grid.append(button);
    }
  }

  async function loadAppointments() {
    if (!calendarConnected) return;
    appointmentAbortController?.abort();
    appointmentAbortController = new AbortController();
    const from = dateKey(displayedMonth.getFullYear(), displayedMonth.getMonth(), 1);
    const to = dateKey(displayedMonth.getFullYear(), displayedMonth.getMonth() + 1, 1);
    try {
      const query = new URLSearchParams({ from, to });
      const [result, currentSummary] = await Promise.all([
        api(`/api/admin/appointments?${query}`, { signal: appointmentAbortController.signal }),
        api("/api/admin/summary", { signal: appointmentAbortController.signal }),
      ]);
      appointments = result.appointments;
      summary = currentSummary;
      renderStats();
      renderCalendar();
      renderAppointments();
      setPageError("");
    } catch (error) {
      if (error.name !== "AbortError") setPageError(error.message);
    }
  }

  function setCalendarConnected(connected, email, calendarUrl) {
    calendarConnected = connected;
    calendarWarning.hidden = connected;
    document.getElementById("admin-add-appointment").disabled = !connected;
    document.getElementById("admin-disconnect-calendar").hidden = !connected;
    document.getElementById("admin-disconnect-calendar").disabled = !connected;
    if (connected) {
      setCalendarMessage(`Agenda conectada${email ? ` con ${email}` : ""}.`);
      if (calendarUrl) {
        calendarLink.href = calendarUrl;
        calendarLink.hidden = false;
      }
    } else {
      setCalendarMessage("La agenda de Google todavía no está conectada.", true);
      calendarLink.hidden = true;
    }
  }

  function showAuthError(code) {
    const messages = {
      login_cancelled: "Se canceló el inicio de sesión.",
      not_authorized: "Esta cuenta de Google no está autorizada para administrar el sitio.",
      calendar_cancelled: "Se canceló la conexión con Google Calendar.",
      wrong_calendar_account: "Conectá la cuenta configurada como propietaria del calendario.",
      calendar_reconnect: "Google no devolvió permiso persistente. Volvé a conectar Calendar y aceptá el acceso.",
    };
    const message = messages[code];
    if (message) {
      loginError.textContent = message;
      loginError.hidden = false;
    }
  }

  async function loadDashboard() {
    const [{ services, timeZone: configuredTimeZone }, session] = await Promise.all([
      api("/api/public/config"),
      api("/api/admin/session"),
    ]);
    timeZone = configuredTimeZone;
    selectedDate = todayKey();
    addServiceOptions(services);
    if (!session.authenticated) return;

    login.hidden = true;
    dashboard.hidden = false;
    document.getElementById("admin-account-badge").hidden = false;
    document.getElementById("admin-signed-in-email").textContent = session.email;
    document.getElementById("admin-add-appointment").disabled = true;
    csrfToken = session.csrfToken;
    renderCalendar();
    renderAppointments();

    const calendar = await api("/api/admin/calendar/status");
    setCalendarConnected(calendar.connected, calendar.email, calendar.calendarUrl);
    if (calendar.connected) {
      await loadAppointments();
      window.setInterval(() => {
        if (!document.hidden) loadAppointments();
      }, 60_000);
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden) loadAppointments();
      });
    }
  }

  document.getElementById("admin-prev-month").addEventListener("click", async () => {
    displayedMonth = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth() - 1, 1);
    await loadAppointments();
  });
  document.getElementById("admin-next-month").addEventListener("click", async () => {
    displayedMonth = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth() + 1, 1);
    await loadAppointments();
  });
  document.getElementById("admin-add-appointment").addEventListener("click", () => openDialog());
  document.getElementById("admin-dialog-close").addEventListener("click", () => dialog.close());
  document.getElementById("admin-dialog-cancel").addEventListener("click", () => dialog.close());
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    saveButton.disabled = true;
    dialogError.hidden = true;
    const id = document.getElementById("admin-appointment-id").value;
    const body = Object.fromEntries(new FormData(form));
    try {
      await api(id ? `/api/admin/appointments/${encodeURIComponent(id)}` : "/api/admin/appointments", {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(body),
      });
      const [year, month, day] = body.date.split("-").map(Number);
      displayedMonth = new Date(year, month - 1, 1);
      selectedDate = body.date;
      dialog.close();
      await loadAppointments();
    } catch (error) {
      dialogError.textContent = error.message;
      dialogError.hidden = false;
    } finally {
      saveButton.disabled = false;
    }
  });
  document.getElementById("admin-logout").addEventListener("click", async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    try {
      await api("/api/admin/logout", { method: "POST" });
      window.location.reload();
    } catch (error) {
      button.disabled = false;
      setPageError(error.message);
    }
  });
  document.getElementById("admin-disconnect-calendar").addEventListener("click", async (event) => {
    const button = event.currentTarget;
    if (!window.confirm("¿Desconectar la cuenta de Google Calendar?")) return;
    button.disabled = true;
    try {
      await api("/api/admin/calendar/connection", { method: "DELETE" });
      appointments = [];
      summary = { today: 0, pending: 0, week: 0 };
      renderStats();
      renderCalendar();
      renderAppointments();
      setCalendarConnected(false, "", "");
    } catch (error) {
      button.disabled = false;
      setPageError(error.message);
    }
  });

  const url = new URL(window.location.href);
  const authError = url.searchParams.get("error");
  const calendarConnectedFromOAuth = url.searchParams.has("calendar");
  loadDashboard()
    .then(() => {
      showAuthError(authError);
      if (calendarConnectedFromOAuth && !dashboard.hidden) {
        setPageError("");
        setCalendarMessage("Agenda de Google Calendar conectada correctamente.");
      }
      url.searchParams.delete("error");
      url.searchParams.delete("calendar");
      window.history.replaceState({}, "", url);
    })
    .catch((error) => {
      const target = dashboard.hidden ? loginError : pageError;
      target.textContent = `${error.message} Abrí el sitio mediante npm start y completá la configuración del servidor.`;
      target.hidden = false;
    });
}

document.addEventListener("DOMContentLoaded", initAdminDashboard);
