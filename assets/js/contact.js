const form = document.querySelector("[data-contact-form]");
const status = document.querySelector("[data-contact-status]");
const submitButton = document.querySelector("[data-contact-submit]");
const turnstileContainer = document.querySelector("[data-turnstile-container]");

const SUPABASE_URL = "https://lgchqleltppfdgtpgsbj.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_ZHBBlxQVW0MBUUwQ5Kv1Aw_uufRzvu1";
const TURNSTILE_SITE_KEY = "0x4AAAAAAFZqFuxTCicmjtlv";

if (form && status && submitButton && turnstileContainer) {
  let turnstileToken = "";
  let turnstileWidgetId = null;
  const defaultSubmitLabel = submitButton.textContent;

  const showStatus = (message, type) => {
    status.className = `form-status ${type}`;
    status.textContent = message;
  };

  const setVerificationReady = (isReady) => {
    submitButton.disabled = !isReady;
    submitButton.textContent = defaultSubmitLabel;
  };

  const resetTurnstile = () => {
    turnstileToken = "";
    setVerificationReady(false);
    if (window.turnstile && turnstileWidgetId !== null) {
      window.turnstile.reset(turnstileWidgetId);
    }
  };

  const renderTurnstile = () => {
    if (!window.turnstile || turnstileWidgetId !== null) return false;
    turnstileWidgetId = window.turnstile.render(turnstileContainer, {
      sitekey: TURNSTILE_SITE_KEY,
      action: "contact",
      theme: "auto",
      callback: (token) => {
        turnstileToken = token;
        setVerificationReady(true);
      },
      "expired-callback": resetTurnstile,
      "error-callback": () => {
        resetTurnstile();
        showStatus("Security verification could not load. Please refresh the page or contact us by email or telephone.", "error");
      },
    });
    return true;
  };

  setVerificationReady(false);
  let renderAttempts = 0;
  const renderTimer = window.setInterval(() => {
    renderAttempts += 1;
    if (renderTurnstile() || renderAttempts >= 100) {
      window.clearInterval(renderTimer);
      if (renderAttempts >= 100 && turnstileWidgetId === null) {
        showStatus("Security verification could not load. Please refresh the page or contact us by email or telephone.", "error");
      }
    }
  }, 100);

  const validateContactDetails = () => {
    const method = form.elements.preferred_contact.value;
    const email = form.elements.email;
    const phone = form.elements.phone;
    email.setCustomValidity("");
    phone.setCustomValidity("");

    if ((method === "email" || method === "either") && !email.value.trim()) {
      email.setCustomValidity("Please enter an email address for us to contact you.");
    }
    if (method === "phone" && !phone.value.trim()) {
      phone.setCustomValidity("Please enter a telephone number for us to contact you.");
    }
    if (method === "either" && !email.value.trim() && !phone.value.trim()) {
      email.setCustomValidity("Please enter an email address or telephone number.");
    }
  };

  form.addEventListener("change", (event) => {
    if (event.target.matches("[name='preferred_contact'], [name='email'], [name='phone']")) {
      validateContactDetails();
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    validateContactDetails();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const values = new FormData(form);
    if (String(values.get("website") || "").trim()) {
      form.reset();
      resetTurnstile();
      showStatus("Thank you. Your enquiry has been received.", "success");
      return;
    }

    if (!turnstileToken) {
      showStatus("Please complete the security verification before sending your enquiry.", "error");
      return;
    }

    const payload = {
      name: String(values.get("name") || "").trim(),
      business: String(values.get("business") || "").trim() || null,
      email: String(values.get("email") || "").trim() || null,
      phone: String(values.get("phone") || "").trim() || null,
      preferred_contact: String(values.get("preferred_contact") || ""),
      preferred_time: String(values.get("preferred_time") || "").trim() || null,
      reason: String(values.get("reason") || "").trim(),
      message: String(values.get("message") || "").trim(),
      privacy_acknowledged: values.get("privacy_acknowledged") === "on",
      turnstile_token: turnstileToken,
    };

    submitButton.disabled = true;
    submitButton.textContent = "Sending…";
    status.className = "form-status hidden";

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/contact-intake`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Request failed");

      form.reset();
      showStatus(`Thank you. Your enquiry has been received. Your reference is ${result.reference}.`, "success");
    } catch (error) {
      console.error("Contact request could not be saved:", error);
      showStatus("We could not send the form just now. Please email support@georgetech.uk or call 01959 474747 instead.", "error");
    } finally {
      resetTurnstile();
    }
  });
}
