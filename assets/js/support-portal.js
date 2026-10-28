import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

    const supabase = createClient(
      "https://lgchqleltppfdgtpgsbj.supabase.co",
      "sb_publishable_ZHBBlxQVW0MBUUwQ5Kv1Aw_uufRzvu1"
    );

    import { initClientBilling } from "./client-billing.js?v=20261028-1";
    import { initPortalNavigation, firstNameGreeting } from "./portal-navigation.js?v=20261028-2";
    import { initClientAccount } from "./client-account.js?v=20261028-2";

    const byId = (id) => document.getElementById(id);
    const loadingSection = byId("loading-section");
    const loginSection = byId("login-section");
    const ticketSection = byId("ticket-section");
    const loginForm = byId("login-form");
    const supportForm = byId("support-form");
    const replyForm = byId("reply-form");
    const statusBox = byId("status");
    const accessBanner = byId("access-banner");
    let currentUser = null;
    let selectedTicket = null;
    let currentProfile = null;
    let currentTickets = [];
    const defaultProducts = ["GeorgeTech Extractor", "Folder Manager", "SMS Portal", "Other"];
    const statusOrder = {
      new: 1,
      in_progress: 2,
      waiting_on_customer: 3,
      resolved: 4,
      closed: 5
    };

    function showStatus(message, type = "error") {
      statusBox.textContent = message;
      statusBox.className = `status ${type}`;
    }

    function clearStatus() {
      statusBox.textContent = "";
      statusBox.className = "status hidden";
    }

    function showAccessBanner(access) {
      if (!access || access.can_access !== false) {
        accessBanner.classList.add("hidden");
        accessBanner.replaceChildren();
        return;
      }

      const title = document.createElement("strong");
      title.textContent = access.banner_title || "Support Centre access suspended";
      const message = document.createElement("span");
      message.textContent = access.banner_message || "Your access is currently suspended. Please contact GeorgeTech support if you believe this is incorrect.";
      accessBanner.replaceChildren(title, message);
      accessBanner.classList.remove("hidden");
    }

    function formatDate(value) {
      return new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(new Date(value));
    }

    function statusLabel(value) {
      return value.replaceAll("_", " ");
    }

    function ticketReadKey(ticket) {
      return `georgetech-support-read:${currentUser?.id || "guest"}:${ticket.id}`;
    }

    function ticketFingerprint(ticket) {
      return [ticket.updated_at, ticket.status].filter(Boolean).join("|");
    }

    function isTicketUnread(ticket) {
      return window.localStorage.getItem(ticketReadKey(ticket)) !== ticketFingerprint(ticket);
    }

    function markTicketRead(ticket) {
      window.localStorage.setItem(ticketReadKey(ticket), ticketFingerprint(ticket));
    }

    function preferredName() {
      return currentProfile?.display_name
        || currentProfile?.full_name
        || currentUser?.user_metadata?.full_name
        || currentUser?.user_metadata?.name
        || currentUser?.email?.split("@")[0]
        || "";
    }

    function prefillRequesterFields() {
      byId("portal-greeting").textContent = firstNameGreeting(currentProfile, currentUser);
      byId("email").value = currentUser?.email || "";
      byId("name").value = preferredName();
    }

    function populateProductOptions(products = defaultProducts) {
      const select = byId("product");
      const current = select.value;
      const uniqueProducts = [...new Set(products.filter(Boolean))];
      select.replaceChildren(new Option("Select a product", "", true, !current));
      uniqueProducts.forEach((product) => select.add(new Option(product, product, false, product === current)));
      if (current && uniqueProducts.includes(current)) select.value = current;
    }

    async function loadSupportProfile() {
      currentProfile = null;
      try {
        const { data, error } = await supabase.rpc("get_my_support_profile");
        if (!error) currentProfile = Array.isArray(data) ? data[0] : data;
      } catch (_error) {
        currentProfile = null;
      }
      prefillRequesterFields();
    }

    async function loadSupportAccess() {
      try {
        const { data, error } = await supabase.rpc("get_my_support_access", {
          target_app_code: "customer_portal"
        });
        if (!error) {
          showAccessBanner(Array.isArray(data) ? data[0] : data);
          return;
        }
      } catch (_error) {
        // If the migration has not reached this environment yet, keep the portal usable.
      }
      showAccessBanner(null);
    }

    async function loadProducts() {
      try {
        const { data, error } = await supabase.rpc("get_support_products");
        if (!error && data?.length) {
          populateProductOptions([...data.map((item) => item.name || item.product_name || item), "Other"]);
          return;
        }
      } catch (_error) {
        // Fall back below if the helper migration is not deployed yet.
      }

      try {
        const { data, error } = await supabase
          .from("app_catalog")
          .select("name")
          .eq("is_active", true)
          .order("sort_order", { ascending: true })
          .order("name", { ascending: true });
        if (!error && data?.length) {
          populateProductOptions([...data.map((item) => item.name), "Other"]);
          return;
        }
      } catch (_error) {
        // Fall back below if app_catalog is not readable by this session.
      }

      populateProductOptions(defaultProducts);
    }

    const panelNames = ['tickets-panel','payments-panel','account-panel','services-panel','appointments-panel','help-panel'];
    function setPanel(panelId, historyMode = 'push') {
      if (![...panelNames, 'new-ticket-panel'].includes(panelId)) panelId = 'tickets-panel';
      const activeTab = panelId === 'new-ticket-panel' ? 'tickets-panel' : panelId;
      document.querySelectorAll('.portal-tab').forEach(tab => {
        const active = tab.dataset.panel === activeTab;
        tab.classList.toggle('active', active);
        tab.setAttribute('aria-selected', String(active));
        tab.tabIndex = active ? 0 : -1;
      });
      document.querySelectorAll('[data-portal-panel]').forEach(panel => {
        panel.classList.toggle('hidden', panel.id !== panelId);
        panel.hidden = panel.id !== panelId;
      });
      clearStatus();
      const hash = '#' + panelId.replace('-panel','');
      if (historyMode && location.hash !== hash) history[historyMode === 'replace' ? 'replaceState' : 'pushState']({}, '', hash);
      if (panelId === 'tickets-panel') loadTickets();
      if (panelId === 'payments-panel') clientBilling.load();
      navigation.panelChanged();
    }
    const navigation = initPortalNavigation();
    const clientBilling = initClientBilling({supabase,getUser:()=>currentUser});
    byId('billing-help-ticket').addEventListener('click',()=>{setPanel('new-ticket-panel');byId('subject').value='Payment enquiry';byId('details').focus();});
    const clientAccount = initClientAccount({supabase, getUser: () => currentUser,
      onAccountLoaded: account => {if(account){currentProfile={...currentProfile,...account};prefillRequesterFields();}},
      onDetailsSaved: account => {currentProfile = {...currentProfile, ...account}; prefillRequesterFields();},
      onRequestService: name => {
        setPanel('new-ticket-panel');
        const select=byId('product');
        if (![...select.options].some(option=>option.value===name)) select.add(new Option(name,name));
        select.value=name; byId('subject').value='Service access: '+name;
        byId('category').value='Account or login'; byId('details').focus();
      }
    });

    function validateFiles(files) {
      const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      for (const file of files) {
        if (!allowed.includes(file.type)) throw new Error(`${file.name} is not a supported image.`);
        if (file.size > 5 * 1024 * 1024) throw new Error(`${file.name} is larger than 5 MB.`);
      }
    }

    function setupDropZones() {
      document.querySelectorAll(".drop-zone").forEach((zone) => {
        const input = byId(zone.dataset.input);
        const preview = zone.querySelector(".file-preview");

        const setFiles = (incoming, append = true) => {
          const files = append ? [...input.files, ...incoming] : [...incoming];
          const unique = files.filter((file, index, all) =>
            all.findIndex((candidate) => candidate.name === file.name && candidate.size === file.size && candidate.lastModified === file.lastModified) === index
          );
          try { validateFiles(unique); }
          catch (error) { showStatus(error.message); return; }
          const transfer = new DataTransfer();
          unique.forEach((file) => transfer.items.add(file));
          input.files = transfer.files;
          preview.replaceChildren(...unique.map((file) => {
            const chip = document.createElement("span");
            chip.className = "file-chip";
            chip.textContent = file.name;
            chip.title = file.name;
            return chip;
          }));
        };

        zone.addEventListener("click", (event) => {
          if (event.target !== input) input.click();
        });
        zone.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") { event.preventDefault(); input.click(); }
        });
        input.addEventListener("change", () => setFiles(input.files, false));
        ["dragenter", "dragover"].forEach((name) => zone.addEventListener(name, (event) => {
          event.preventDefault(); zone.classList.add("dragging");
        }));
        ["dragleave", "drop"].forEach((name) => zone.addEventListener(name, (event) => {
          event.preventDefault(); zone.classList.remove("dragging");
        }));
        zone.addEventListener("drop", (event) => setFiles(event.dataTransfer.files));
        zone.addEventListener("paste", (event) => {
          const pasted = [...event.clipboardData.items]
            .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
            .map((item, index) => {
              const blob = item.getAsFile();
              const extension = blob.type.split("/")[1]?.replace("jpeg", "jpg") || "png";
              return new File([blob], `pasted-screenshot-${Date.now()}-${index + 1}.${extension}`, { type: blob.type });
            });
          if (pasted.length) { event.preventDefault(); setFiles(pasted); }
        });
      });
    }

    async function uploadFiles(files, ticketId, commentId = null) {
      const selectedFiles = Array.from(files || []);
      validateFiles(selectedFiles);

      for (const file of selectedFiles) {
        const extension = file.name.split(".").pop()?.toLowerCase() || "image";
        const path = `${currentUser.id}/${ticketId}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from("support-attachments")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (uploadError) throw uploadError;

        const { error: recordError } = await supabase.from("support_ticket_attachments").insert({
          ticket_id: ticketId,
          comment_id: commentId,
          uploaded_by: currentUser.id,
          storage_path: path,
          file_name: file.name,
          mime_type: file.type,
          file_size: file.size
        });
        if (recordError) throw recordError;
      }
    }

    async function loadTickets() {
      const list = byId("ticket-list");
      list.innerHTML = '<div class="empty-state">Loading tickets…</div>';
      const { data, error } = await supabase
        .from("support_tickets")
        .select("id,ticket_number,subject,product,status,created_at,updated_at,description")
        .order("created_at", { ascending: false });

      if (error) {
        list.innerHTML = '<div class="empty-state">Tickets could not be loaded.</div>';
        return showStatus("We couldn’t load your tickets. Please try again.");
      }

      currentTickets = data || [];
      renderTickets();
    }

    function renderTickets() {
      const list = byId("ticket-list");
      const showClosed = byId("show-closed-tickets").checked;
      const sortBy = byId("ticket-sort").value;
      const tickets = currentTickets
        .filter((ticket) => showClosed || ticket.status !== "closed" || isTicketUnread(ticket))
        .sort((left, right) => {
          if (sortBy === "date_asc") return new Date(left.created_at) - new Date(right.created_at);
          if (sortBy === "status") {
            return (statusOrder[left.status] || 99) - (statusOrder[right.status] || 99)
              || new Date(right.created_at) - new Date(left.created_at);
          }
          if (sortBy === "product") {
            return (left.product || "").localeCompare(right.product || "")
              || new Date(right.created_at) - new Date(left.created_at);
          }
          return new Date(right.created_at) - new Date(left.created_at);
        });

      if (!currentTickets.length) {
        list.innerHTML = '<div class="empty-state">You don’t have any support tickets yet.</div>';
        return;
      }

      if (!tickets.length) {
        list.innerHTML = '<div class="empty-state">No open tickets. Tick “Show closed tickets” to include closed requests.</div>';
        return;
      }

      const createTicketItem = (ticket) => {
        const unread = isTicketUnread(ticket);
        const button = document.createElement("button");
        button.type = "button";
        button.className = `ticket-item${unread ? " unread" : ""}`;
        const meta = document.createElement("div");
        meta.className = "ticket-meta";
        const reference = document.createElement("span");
        reference.textContent = `${ticket.ticket_number} · ${formatDate(ticket.created_at)}`;
        const badges = document.createElement("span");
        badges.className = "ticket-badges";
        const badge = document.createElement("span");
        badge.className = `badge ${ticket.status}`;
        badge.textContent = statusLabel(ticket.status);
        badges.append(badge);
        if (unread) {
          const unreadBadge = document.createElement("span");
          unreadBadge.className = "badge unread-pill";
          unreadBadge.textContent = "Unread";
          badges.append(unreadBadge);
        }
        meta.append(reference, badges);
        const subject = document.createElement("p");
        subject.className = "ticket-subject";
        subject.textContent = ticket.subject;
        const product = document.createElement("span");
        product.className = "ticket-product";
        product.textContent = ticket.product;
        button.append(meta, subject, product);
        button.addEventListener("click", () => openTicket(ticket));
        return button;
      };

      if (sortBy === "status" || sortBy === "product") {
        const groups = new Map();
        tickets.forEach((ticket) => {
          const groupName = sortBy === "status" ? statusLabel(ticket.status) : (ticket.product || "Other");
          if (!groups.has(groupName)) groups.set(groupName, []);
          groups.get(groupName).push(ticket);
        });

        list.replaceChildren(...[...groups.entries()].map(([groupName, groupTickets]) => {
          const group = document.createElement("section");
          group.className = "ticket-group";
          const heading = document.createElement("h3");
          heading.className = "ticket-group-heading";
          const count = document.createElement("span");
          count.className = "ticket-count";
          count.textContent = `${groupTickets.length} ${groupTickets.length === 1 ? "ticket" : "tickets"}`;
          heading.append(document.createTextNode(groupName), count);
          group.append(heading, ...groupTickets.map(createTicketItem));
          return group;
        }));
        return;
      }

      list.replaceChildren(...tickets.map(createTicketItem));
    }

    async function openTicket(ticket) {
      selectedTicket = ticket;
      markTicketRead(ticket);
      clearStatus();
      byId("ticket-list-view").classList.add("hidden");
      byId("ticket-detail").classList.remove("hidden");
      byId("detail-subject").textContent = ticket.subject;
      byId("detail-reference").textContent = `${ticket.ticket_number} · ${ticket.product} · Opened ${formatDate(ticket.created_at)}`;
      const detailMeta = byId("detail-reference");
      detailMeta.replaceChildren(...[
        ["Ticket", ticket.ticket_number],
        ["App", ticket.product],
        ["Opened", formatDate(ticket.created_at)]
      ].map(([label, value]) => {
        const item = document.createElement("span");
        item.className = "meta-item";
        const labelElement = document.createElement("strong");
        labelElement.textContent = `${label}:`;
        item.append(labelElement, document.createTextNode(value));
        return item;
      }));

      const descriptionLines = ticket.description.split(/\r?\n/);
      const firstContentLine = descriptionLines.findIndex((line) => line.trim());
      const descriptionTitle = byId("detail-description-title");
      const hasReportTitle = firstContentLine >= 0 && /^In-App Bug Report:?$/i.test(descriptionLines[firstContentLine].trim());
      descriptionTitle.textContent = hasReportTitle ? descriptionLines[firstContentLine].trim().replace(/:$/, "") : "";
      descriptionTitle.classList.toggle("hidden", !hasReportTitle);
      if (hasReportTitle) descriptionLines.splice(firstContentLine, 1);
      byId("detail-description").textContent = descriptionLines.join("\n").trim();
      const badge = byId("detail-status");
      badge.className = `badge ${ticket.status}`;
      badge.textContent = statusLabel(ticket.status);
      const isClosed = ticket.status === "closed";
      replyForm.classList.toggle("hidden", isClosed);
      byId("close-ticket-button").classList.toggle("hidden", isClosed);
      await loadConversation(ticket.id);
    }

    async function loadConversation(ticketId) {
      const timeline = byId("comment-timeline");
      const gallery = byId("ticket-attachments");
      timeline.innerHTML = '<div class="empty-state">Loading conversation…</div>';
      gallery.replaceChildren();

      const [commentsResult, attachmentsResult] = await Promise.all([
        supabase.from("support_ticket_comments").select("id,author_type,author_name,body,created_at").eq("ticket_id", ticketId).order("created_at"),
        supabase.from("support_ticket_attachments").select("id,comment_id,storage_path,file_name").eq("ticket_id", ticketId).order("created_at")
      ]);

      if (commentsResult.error || attachmentsResult.error) {
        timeline.innerHTML = '<div class="empty-state">Conversation could not be loaded.</div>';
        return;
      }

      const comments = commentsResult.data;
      const attachments = (await Promise.all(attachmentsResult.data.map(async (attachment) => {
        const { data } = await supabase.storage
          .from("support-attachments")
          .createSignedUrl(attachment.storage_path, 3600);
        return data?.signedUrl ? { ...attachment, signedUrl: data.signedUrl } : null;
      }))).filter(Boolean);

      const createAttachmentLink = (attachment) => {
        const link = document.createElement("a");
        link.href = attachment.signedUrl;
        link.target = "_blank";
        link.rel = "noopener";
        link.title = attachment.file_name;
        const image = document.createElement("img");
        image.src = attachment.signedUrl;
        image.alt = attachment.file_name;
        image.loading = "lazy";
        link.append(image);
        return link;
      };

      gallery.replaceChildren(...attachments.filter((attachment) => !attachment.comment_id).map(createAttachmentLink));
      timeline.replaceChildren(...comments.map((comment) => {
        const item = document.createElement("article");
        item.className = `comment ${comment.author_type}`;
        const head = document.createElement("div");
        head.className = "comment-head";
        const author = document.createElement("strong");
        author.textContent = comment.author_type === "staff" ? `${comment.author_name} · GeorgeTech` : comment.author_name;
        const date = document.createElement("span");
        date.textContent = formatDate(comment.created_at);
        const body = document.createElement("p");
        body.textContent = comment.body;
        head.append(author, date);
        item.append(head, body);
        const commentAttachments = attachments.filter((attachment) => attachment.comment_id === comment.id);
        if (commentAttachments.length) {
          const commentGallery = document.createElement("div");
          commentGallery.className = "attachment-grid";
          commentGallery.replaceChildren(...commentAttachments.map(createAttachmentLink));
          item.append(commentGallery);
        }
        return item;
      }));

      if (!comments.length) {
        timeline.innerHTML = '<div class="empty-state">No comments yet. We’ll post updates here.</div>';
      }

    }

    let loadedUserId = null;
    async function showSession(session) {
      currentUser = session?.user || null;
      loadingSection.classList.add('hidden');
      if (!currentUser) { clientAccount.clear(); clientBilling.clear();document.body.classList.remove('portal-signed-in');byId('portal-user').hidden=true; return window.location.replace('support.html'); }
      if (loadedUserId === currentUser.id) return;
      loadedUserId = currentUser.id;
      currentProfile = null;
      clientBilling.clear();document.body.classList.add('portal-signed-in');byId('portal-user').hidden=false;
      loginSection.classList.add('hidden'); ticketSection.classList.remove('hidden');
      prefillRequesterFields();
      setPanel(location.hash.slice(1) + '-panel', 'replace');
      navigation.welcome();
      await Promise.all([loadSupportProfile(), loadProducts(), loadSupportAccess(), clientAccount.load()]);
    }
    const tabs=[...document.querySelectorAll('.portal-tab')];
    tabs.forEach((tab,index) => {
      tab.addEventListener('click', () => setPanel(tab.dataset.panel));
      tab.addEventListener('keydown', event => {
        let next;
        if(event.key==='ArrowRight') next=(index+1)%tabs.length;
        if(event.key==='ArrowLeft') next=(index+tabs.length-1)%tabs.length;
        if(event.key==='Home') next=0;
        if(event.key==='End') next=tabs.length-1;
        if(next===undefined) return;
        event.preventDefault();navigation.revealTab(tabs[next]);tabs[next].focus();setPanel(tabs[next].dataset.panel);
      });
    });
    window.addEventListener('popstate',()=>setPanel(location.hash.slice(1)+'-panel',false));
    byId('new-request-button').addEventListener('click',()=>setPanel('new-ticket-panel'));
    byId('help-new-request').addEventListener('click',()=>setPanel('new-ticket-panel'));
    byId('cancel-new-request').addEventListener('click',()=>setPanel('tickets-panel'));

    [supportForm, replyForm].forEach((form) => {
      form.addEventListener("reset", () => {
        window.setTimeout(() => form.querySelectorAll(".file-preview").forEach((preview) => preview.replaceChildren()), 0);
      });
    });

    byId("back-to-tickets").addEventListener("click", () => {
      selectedTicket = null;
      byId("ticket-detail").classList.add("hidden");
      byId("ticket-list-view").classList.remove("hidden");
      loadTickets();
    });

    byId("show-closed-tickets").addEventListener("change", renderTickets);
    byId("ticket-sort").addEventListener("change", renderTickets);

    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      clearStatus();
      const button = byId("login-button");
      button.disabled = true;
      button.textContent = "Signing in…";
      const values = new FormData(loginForm);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.get("email"),
        password: values.get("password")
      });
      button.disabled = false;
      button.textContent = "Sign in";
      if (error) return showStatus(error.message);
      loginForm.reset();
      showSession(data.session);
    });

    byId("forgot-password").addEventListener("click", async (event) => {
      event.preventDefault();
      const email = byId("login-email").value.trim();
      if (!email) return showStatus("Enter your email address first.");
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/password-reset.html`
      });
      if (error) return showStatus(error.message);
      showStatus("Password reset email sent. Check your inbox.", "success");
    });

    byId("logout-button").addEventListener("click", async () => {
      clientBilling.clear();clientAccount.clear();navigation.clear();
      await supabase.auth.signOut();
      window.location.replace("support.html");
    });

    supportForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      clearStatus();
      if (!supportForm.reportValidity() || !currentUser) return;
      const files = byId("ticket-files").files;
      try { validateFiles(files); } catch (error) { return showStatus(error.message); }

      const button = byId("submit-button");
      button.disabled = true;
      button.textContent = "Submitting…";
      const values = new FormData(supportForm);
      const { data, error } = await supabase.from("support_tickets").insert({
        user_id: currentUser.id,
        requester_name: values.get("name"),
        requester_email: currentUser.email,
        product: values.get("product"),
        category: values.get("category"),
        subject: values.get("subject"),
        description: values.get("details")
      }).select("id,ticket_number").single();

      if (error) {
        button.disabled = false;
        button.innerHTML = 'Submit support request <svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>';
        return showStatus("We couldn’t submit your request. Please try again.");
      }

      try {
        await uploadFiles(files, data.id);
      } catch (uploadError) {
        console.error(uploadError);
        showStatus(`Ticket ${data.ticket_number} was created, but one or more screenshots could not be uploaded.`, "error");
      }

      supportForm.reset();
      prefillRequesterFields();
      button.disabled = false;
      button.innerHTML = 'Submit support request <svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>';
      if (statusBox.classList.contains("hidden")) showStatus(`Ticket ${data.ticket_number} was submitted.`, "success");
      setTimeout(() => setPanel("tickets-panel"), 900);
    });

    replyForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      clearStatus();
      if (!selectedTicket || !replyForm.reportValidity()) return;
      const files = byId("reply-files").files;
      try { validateFiles(files); } catch (error) { return showStatus(error.message); }
      const button = byId("reply-button");
      button.disabled = true;
      button.textContent = "Sending…";
      const body = new FormData(replyForm).get("body");
      const authorName = preferredName() || currentUser.email;
      const { data, error } = await supabase.from("support_ticket_comments").insert({
        ticket_id: selectedTicket.id,
        author_id: currentUser.id,
        author_type: "customer",
        author_name: authorName,
        body
      }).select("id").single();

      if (error) {
        button.disabled = false;
        button.textContent = "Send comment";
        return showStatus("Your comment could not be sent.");
      }

      try { await uploadFiles(files, selectedTicket.id, data.id); }
      catch (uploadError) { showStatus("Your comment was sent, but a screenshot could not be uploaded."); }
      replyForm.reset();
      button.disabled = false;
      button.textContent = "Send comment";
      await loadConversation(selectedTicket.id);
    });

    byId("close-ticket-button").addEventListener("click", async () => {
      if (!selectedTicket || !window.confirm("Close this support request? You won’t be able to add more comments.")) return;
      const { data, error } = await supabase.rpc("close_own_support_ticket", {
        target_ticket_id: selectedTicket.id
      });
      if (error || !data) return showStatus("This ticket could not be closed.");
      selectedTicket.status = "closed";
      showStatus(`${selectedTicket.ticket_number} has been closed.`, "success");
      openTicket(selectedTicket);
    });

    setupDropZones();
    const { data: { session } } = await supabase.auth.getSession();
    showSession(session);
    supabase.auth.onAuthStateChange((_event, nextSession) => { setTimeout(() => showSession(nextSession), 0); });
