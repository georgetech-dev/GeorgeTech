import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const form = document.querySelector("[data-contact-form]");
const status = document.querySelector("[data-contact-status]");
const submitButton = document.querySelector("[data-contact-submit]");

if (form && status && submitButton) {
  const supabase = createClient(
    "https://lgchqleltppfdgtpgsbj.supabase.co",
    "sb_publishable_ZHBBlxQVW0MBUUwQ5Kv1Aw_uufRzvu1"
  );

  const showStatus = (message, type) => {
    status.className = `form-status ${type}`;
    status.textContent = message;
  };

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
      showStatus("Thank you. Your enquiry has been received.", "success");
      return;
    }

    const reference = `GTQ-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const payload = {
      reference,
      name: String(values.get("name") || "").trim(),
      business: String(values.get("business") || "").trim() || null,
      email: String(values.get("email") || "").trim() || null,
      phone: String(values.get("phone") || "").trim() || null,
      preferred_contact: String(values.get("preferred_contact") || ""),
      preferred_time: String(values.get("preferred_time") || "").trim() || null,
      reason: String(values.get("reason") || "").trim(),
      message: String(values.get("message") || "").trim(),
      privacy_acknowledged: values.get("privacy_acknowledged") === "on"
    };

    submitButton.disabled = true;
    submitButton.textContent = "Sending…";
    status.className = "form-status hidden";

    const { error } = await supabase.from("contact_requests").insert(payload);

    submitButton.disabled = false;
    submitButton.textContent = "Send enquiry";

    if (error) {
      console.error("Contact request could not be saved:", error);
      showStatus("We could not send the form just now. Please email support@georgetech.uk instead.", "error");
      return;
    }

    form.reset();
    showStatus(`Thank you. Your enquiry has been received. Your reference is ${reference}.`, "success");
  });
}
