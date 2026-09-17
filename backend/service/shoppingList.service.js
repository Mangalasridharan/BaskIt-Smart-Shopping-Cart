const axios = require("axios");

/**
 * Service to sync shopping list items from Google Notes / Google Tasks API
 *
 * @param {string} accessToken - Google OAuth 2.0 User Access Token
 * @returns {Promise<{ success: boolean, count: number, source: string, items: Array }>}
 */
const syncFromGoogleNotes = async (accessToken) => {
  if (!accessToken) {
    const error = new Error("Google access token is required to fetch notes.");
    error.statusCode = 400;
    throw error;
  }

  const items = [];
  let sourceFound = null;

  // 1. Google Tasks API:
  // Primary consumer API for Google shopping lists, to-do lists, and Google Assistant grocery lists.
  try {
    const listsRes = await axios.get(
      "https://tasks.googleapis.com/tasks/v1/users/@me/lists",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: 9000,
      }
    );

    const taskLists = listsRes.data?.items || [];
    if (taskLists.length > 0) {
      // Prioritize lists named "Shopping List", "Groceries", "BaskIt", or "Notes"
      let targetList = taskLists.find((l) =>
        /shopping|grocer|market|baskit|notes|buy/i.test(l.title || "")
      );

      // Fallback to primary / default task list
      if (!targetList) {
        targetList = taskLists[0];
      }

      const tasksRes = await axios.get(
        `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(targetList.id)}/tasks`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          params: { showCompleted: true, showHidden: true, maxResults: 100 },
          timeout: 9000,
        }
      );

      const tasks = tasksRes.data?.items || [];
      for (const t of tasks) {
        const text = String(t.title || "").trim();
        if (text) {
          items.push({
            id: `gt-${t.id || Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            text,
            done: t.status === "completed",
            createdAt: t.updated ? new Date(t.updated).getTime() : Date.now(),
          });
        }
      }

      if (items.length > 0) {
        sourceFound = `Google Tasks ("${targetList.title}")`;
      }
    }
  } catch (err) {
    console.warn(
      "ℹ️ Google Tasks fetch notice:",
      err.response?.data?.error?.message || err.message
    );
  }

  // 2. Google Keep API:
  // Fallback for Workspace accounts or Keep API note integration
  if (items.length === 0) {
    try {
      const keepRes = await axios.get("https://keep.googleapis.com/v1/notes", {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { pageSize: 20 },
        timeout: 9000,
      });

      const notes = keepRes.data?.notes || [];
      const shoppingNote =
        notes.find((n) =>
          /shopping|grocer|market|baskit|notes|buy/i.test(n.title || "")
        ) || notes[0];

      if (shoppingNote) {
        sourceFound = `Google Keep ("${shoppingNote.title || "Notes"}")`;

        // Check if note has checklist items
        if (shoppingNote.body?.list?.listItems) {
          for (const li of shoppingNote.body.list.listItems) {
            const text = String(li.text?.text || "").trim();
            if (text) {
              items.push({
                id: `gk-${Math.random().toString(36).slice(2, 8)}`,
                text,
                done: Boolean(li.checked),
                createdAt: Date.now(),
              });
            }
          }
        } else if (shoppingNote.body?.text?.text) {
          // Plain text note: parse lines
          const lines = shoppingNote.body.text.text
            .split(/\r?\n/)
            .map((l) => l.trim().replace(/^[-*•\d.)]\s*/, ""))
            .filter(Boolean);

          for (const line of lines) {
            items.push({
              id: `gk-${Math.random().toString(36).slice(2, 8)}`,
              text: line,
              done: false,
              createdAt: Date.now(),
            });
          }
        }
      }
    } catch (err) {
      console.warn(
        "ℹ️ Google Keep fetch notice:",
        err.response?.data?.error?.message || err.message
      );
    }
  }

  return {
    success: true,
    count: items.length,
    source: sourceFound || "Google Notes / Tasks",
    items,
  };
};

module.exports = {
  syncFromGoogleNotes,
};
