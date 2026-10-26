const profiles = {
  stephan: {
    firstName: "Stephan",
    lastName: "George",
    name: "Stephan George",
    initials: "SG",
    role: "Director",
    company: "GeorgeTech",
    phoneDisplay: "01959 474747",
    phoneHref: "+441959474747",
    email: "stephan@georgetech.uk",
    website: "https://georgetech.uk",
    intro: "Practical websites, apps and digital systems built around the way your business really works."
  }
};

const interests = {
  website: {
    title: "A website should make the next step obvious.",
    copy: "We can plan, build or improve a site that is clear, fast and easy for you to manage.",
    link: "../business-websites.html",
    label: "See website services"
  },
  booking: {
    title: "Make booking easier for everyone.",
    copy: "We can connect availability, customer details, confirmations and payments into one straightforward flow.",
    link: "../bookings-customer-access.html",
    label: "See booking systems"
  },
  app: {
    title: "Turn a repeated process into a useful tool.",
    copy: "From setup to a custom business app, we can give your team one reliable place to get work done.",
    link: "../app-setup.html",
    label: "See app services"
  },
  automation: {
    title: "Let your systems handle the repetitive parts.",
    copy: "We connect the tools you already use so information moves cleanly and your team spends less time copying it.",
    link: "../automation-integrations.html",
    label: "See automation services"
  },
  support: {
    title: "Already a GeorgeTech customer?",
    copy: "Use Client Support to keep requests, replies and screenshots together in one place.",
    link: "../support.html",
    label: "Open client support"
  }
};

const requestedProfile = new URLSearchParams(window.location.search).get("profile");
const profileKey = requestedProfile ? requestedProfile.trim().toLowerCase() : "stephan";
const profile = profiles[profileKey] || profiles.stephan;

function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.textContent = value;
}

setText("[data-profile-name]", profile.name);
setText("[data-profile-initials]", profile.initials);
setText("[data-profile-role]", profile.role);
setText("[data-profile-intro]", profile.intro);
setText("[data-profile-phone]", profile.phoneDisplay);
setText("[data-profile-email]", profile.email);

const phoneLink = document.querySelector("[data-profile-phone-link]");
const emailLink = document.querySelector("[data-profile-email-link]");
if (phoneLink) phoneLink.href = `tel:${profile.phoneHref}`;
if (emailLink) emailLink.href = `mailto:${profile.email}`;

document.title = `${profile.name} | ${profile.company}`;
const description = document.querySelector('meta[name="description"]');
if (description) {
  description.content = `Meet ${profile.name}, ${profile.role} at ${profile.company}. Save contact details, call, email or start a conversation.`;
}

document.querySelectorAll("[data-current-year]").forEach((element) => {
  element.textContent = new Date().getFullYear();
});

const status = document.querySelector("[data-page-status]");
let statusTimer;
function showStatus(message) {
  if (!status) return;
  window.clearTimeout(statusTimer);
  status.textContent = message;
  status.classList.add("visible");
  statusTimer = window.setTimeout(() => status.classList.remove("visible"), 3200);
}

function escapeVCardValue(value) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");
}

document.querySelector("[data-save-contact]")?.addEventListener("click", () => {
  const vCard = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${escapeVCardValue(profile.lastName)};${escapeVCardValue(profile.firstName)};;;`,
    `FN:${escapeVCardValue(profile.name)}`,
    `ORG:${escapeVCardValue(profile.company)}`,
    `TITLE:${escapeVCardValue(profile.role)}`,
    `TEL;TYPE=WORK,VOICE:${profile.phoneHref}`,
    `EMAIL;TYPE=WORK:${profile.email}`,
    `URL:${profile.website}`,
    "END:VCARD"
  ].join("\r\n");

  const file = new Blob([vCard], { type: "text/vcard;charset=utf-8" });
  const downloadUrl = URL.createObjectURL(file);
  const download = document.createElement("a");
  download.href = downloadUrl;
  download.download = `${profile.firstName}-${profile.lastName}-${profile.company}.vcf`;
  document.body.append(download);
  download.click();
  download.remove();
  window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
  showStatus(`${profile.name} is ready to add to your contacts.`);
});

document.querySelector("[data-share-card]")?.addEventListener("click", async () => {
  const shareData = {
    title: `${profile.name} | ${profile.company}`,
    text: `Contact ${profile.name} at ${profile.company}.`,
    url: window.location.href
  };

  try {
    if (navigator.share) {
      await navigator.share(shareData);
      return;
    }
    await navigator.clipboard.writeText(window.location.href);
    showStatus("Link copied — ready to share.");
  } catch (error) {
    if (error?.name !== "AbortError") showStatus("Copy the page address from your browser to share it.");
  }
});

const interestTitle = document.querySelector("[data-interest-title]");
const interestCopy = document.querySelector("[data-interest-copy]");
const conversationLink = document.querySelector("[data-conversation-link]");

document.querySelector("[data-interest-picker]")?.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-interest]");
  if (!button) return;

  const interest = interests[button.dataset.interest];
  if (!interest) return;

  document.querySelectorAll("[data-interest]").forEach((item) => {
    item.setAttribute("aria-pressed", String(item === button));
  });
  if (interestTitle) interestTitle.textContent = interest.title;
  if (interestCopy) interestCopy.textContent = interest.copy;
  if (conversationLink) {
    conversationLink.href = interest.link;
    conversationLink.textContent = interest.label;
  }
});
