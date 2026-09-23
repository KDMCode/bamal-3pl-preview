/**
 * Bamal 3PL lead form — mock behavior for WordPress content preview.
 * In production, WordPress form plugin + IT webhook/email routing replaces this.
 *
 * Config: window.BAMAL_LEAD_WEBHOOK (string URL or "").
 * Empty webhook → validated success state explaining wiring is TBD (no fake email).
 */
(function () {
  "use strict";

  var form = document.getElementById("lead-form");
  if (!form) return;

  var successEl = document.getElementById("form-success");
  var successMsg = document.getElementById("form-success-msg");
  var statusEl = document.getElementById("form-status");
  var submitBtn = document.getElementById("submit-btn");

  function qs(name) {
    try {
      return new URLSearchParams(window.location.search).get(name) || "";
    } catch (e) {
      return "";
    }
  }

  function fillHidden() {
    var pageUrl = document.getElementById("page_url");
    var utmSource = document.getElementById("utm_source");
    var utmMedium = document.getElementById("utm_medium");
    var utmCampaign = document.getElementById("utm_campaign");
    if (pageUrl) pageUrl.value = window.location.href;
    if (utmSource) utmSource.value = qs("utm_source");
    if (utmMedium) utmMedium.value = qs("utm_medium");
    if (utmCampaign) utmCampaign.value = qs("utm_campaign");
  }

  fillHidden();

  function setError(id, show) {
    var el = document.getElementById(id);
    if (el) el.hidden = !show;
  }

  function validateEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function validate() {
    var ok = true;
    var company = form.company.value.trim();
    var contact = form.contact_name.value.trim();
    var email = form.email.value.trim();
    var preferredLocation = form.preferred_location.value;
    var temperatureType = form.temperature_type.value;
    var services = form.querySelectorAll('input[name="services[]"]:checked');

    form.company.classList.toggle("invalid", !company);
    setError("err-company", !company);
    if (!company) ok = false;

    form.contact_name.classList.toggle("invalid", !contact);
    setError("err-contact_name", !contact);
    if (!contact) ok = false;

    var emailBad = !email || !validateEmail(email);
    form.email.classList.toggle("invalid", emailBad);
    setError("err-email", emailBad);
    if (emailBad) ok = false;

    form.preferred_location.classList.toggle("invalid", !preferredLocation);
    setError("err-preferred_location", !preferredLocation);
    if (!preferredLocation) ok = false;

    form.temperature_type.classList.toggle("invalid", !temperatureType);
    setError("err-temperature_type", !temperatureType);
    if (!temperatureType) ok = false;

    var servicesField = form.querySelector(".fieldset-services");
    var noService = services.length === 0;
    if (servicesField) servicesField.classList.toggle("invalid", noService);
    setError("err-services", noService);
    if (noService) ok = false;

    return ok;
  }

  function collectPayload() {
    var services = [];
    form.querySelectorAll('input[name="services[]"]:checked').forEach(function (cb) {
      services.push(cb.value);
    });
    return {
      company: form.company.value.trim(),
      contact_name: form.contact_name.value.trim(),
      email: form.email.value.trim(),
      phone: form.phone.value.trim(),
      preferred_location: form.preferred_location.value,
      temperature_type: form.temperature_type.value,
      location_city: form.location_city.value.trim(),
      services: services,
      volume_or_skus: form.volume_or_skus.value.trim(),
      timeline: form.timeline.value,
      message: form.message.value.trim(),
      page_url: form.page_url.value,
      utm_source: form.utm_source.value,
      utm_medium: form.utm_medium.value,
      utm_campaign: form.utm_campaign.value,
      submitted_at: new Date().toISOString()
    };
  }

  function showDraftSuccess(payload) {
    form.hidden = true;
    if (successEl) {
      successEl.hidden = false;
      if (successMsg) {
        successMsg.textContent =
          "Your request was validated and is ready for webhook wiring. " +
          "No email was sent from this HTML mock. In WordPress, IT will connect " +
          "the form plugin to email and/or a webhook. Payload preview logged to console.";
      }
    }
    if (typeof console !== "undefined" && console.log) {
      console.log("[Bamal 3PL mock] Lead payload (not sent):", payload);
    }
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    fillHidden();
    if (statusEl) {
      statusEl.textContent = "";
      statusEl.classList.remove("is-error");
    }

    if (!validate()) {
      if (statusEl) {
        statusEl.textContent = "Please fix the highlighted fields.";
        statusEl.classList.add("is-error");
      }
      var firstInvalid = form.querySelector(".invalid");
      if (firstInvalid) {
        var focusable = firstInvalid.matches("input, select, textarea")
          ? firstInvalid
          : firstInvalid.querySelector("input");
        if (focusable) focusable.focus();
      }
      return;
    }

    var payload = collectPayload();
    var webhook =
      typeof window.BAMAL_LEAD_WEBHOOK === "string"
        ? window.BAMAL_LEAD_WEBHOOK.trim()
        : "";

    if (!webhook) {
      showDraftSuccess(payload);
      return;
    }

    if (submitBtn) submitBtn.disabled = true;
    if (statusEl) statusEl.textContent = "Submitting…";

    fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        form.hidden = true;
        if (successEl) {
          successEl.hidden = false;
          if (successMsg) {
            successMsg.textContent =
              "Thank you. Your request was submitted. A Bamal contact will follow up.";
          }
        }
      })
      .catch(function () {
        if (statusEl) {
          statusEl.textContent =
            "Could not reach the webhook. Check BAMAL_LEAD_WEBHOOK or try again.";
          statusEl.classList.add("is-error");
        }
        if (submitBtn) submitBtn.disabled = false;
      });
  });
})();
