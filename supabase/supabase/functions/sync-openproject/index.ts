import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// 1. OpenProject Response Interfaces
interface OpenProjectEntry {
  id: number;
  spentOn: string;
  hours: string; // e.g., "PT3H", "PT7H30M"
  comment: {
    format: string;
    raw: string;
    html: string
  } | null;
  createdAt: string;
  updatedAt: string;
  _links: {
    self: { href: string };
    project: { title: string };
    workPackage?: { title: string; href: string };
    user: { title: string };
    activity: { title: string };
  };
}

// 2. Supabase Database Row Interface
interface DatabaseEntry {
  timeentry_id: number;
  date_spent: string;
  user: string;         // Maps to "user" column
  activity: string;
  work_package: string;
  comment: string | null;
  project: string;
  hours: number | null;
  // created_at is handled by DB default (now())
}

// Helper: Parse ISO 8601 Duration (e.g. "PT7H30M" -> 7.5)
function parseIsoDuration(duration: string): number {
  const regex = /PT(?:(\d+)H)?(?:(\d+)M)?/;
  const match = duration.match(regex);

  if (!match) return 0.0;

  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);

  return hours + (minutes / 60);
}

serve(async (req) => {
  try {
    // A. Setup Supabase Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // B. Setup OpenProject Config
    const opHost = Deno.env.get('OP_HOST'); // e.g., https://your-instance.openproject.com
    const opApiKey = Deno.env.get('OP_API_KEY');

    if (!opHost || !opApiKey) {
      throw new Error("Missing OP_HOST or OP_API_KEY secret.");
    }

    const now = new Date();
    const fortyEightHoursAgo = new Date(now.getTime() - (48 * 60 * 60 * 1000));

    // Log for debugging (in Manila Time so it makes sense to you)
    console.log(`[Sync Start] Fetching entries from: ${fortyEightHoursAgo.toLocaleString("en-US", { timeZone: "Asia/Manila" })} to ${now.toLocaleString("en-US", { timeZone: "Asia/Manila" })}`);

    // 2. Filter: Created Between "48 Hours Ago" AND "NOW"
    const filters = JSON.stringify([
      {
        "createdAt": {
          "operator": "<>d", // "Between" operator
          "values": [
            fortyEightHoursAgo.toISOString(), // Start Time (UTC)
            now.toISOString()                 // End Time (UTC)
          ]
        }
      }
    ]);

    // 3. Sort: Descending (Newest first)
    const sortBy = JSON.stringify([["createdAt", "desc"]]);

    // 4. Construct URL
    const url = `${opHost}/api/v3/time_entries?filters=${encodeURIComponent(filters)}&sortBy=${encodeURIComponent(sortBy)}&pageSize=100`;

    console.log(`Fetching from: ${url}`);

    const authHeader = `Basic ${btoa(`apikey:${opApiKey}`)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`OpenProject API Error: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    const rawEntries: OpenProjectEntry[] = data._embedded.elements;

    if (rawEntries.length === 0) {
      return new Response(JSON.stringify({ message: "No entries found." }), { headers: { "Content-Type": "application/json" } });
    }

    // D. Transform Data
    const upsertPayload: DatabaseEntry[] = rawEntries.map((entry) => {

      // Logic to append (Card #ID)
      let wpLabel = "General"; // Default if no work package
      const wpLink = entry._links.workPackage;

      if (wpLink) {
        // Extract ID from href "/api/v3/work_packages/2455"
        const idMatch = wpLink.href.match(/\/(\d+)$/);
        const cardId = idMatch ? idMatch[1] : "?";
        wpLabel = `Card #${cardId} ${wpLink.title}`;
      }

      return {
        timeentry_id: entry.id,
        date_spent: entry.spentOn,
        user: entry._links.user.title,
        activity: entry._links.activity.title,
        work_package: wpLabel, // Now includes "(Card #123)"
        comment: entry.comment?.raw || null,
        project: entry._links.project.title,
        hours: parseIsoDuration(entry.hours),
      };
    });

    // E. Upsert to Supabase
    const { error } = await supabase
      .from('openproject_timeentries')
      .upsert(upsertPayload, { onConflict: 'timeentry_id' });

    if (error) {
      console.error("Supabase Error:", error);
      throw error;
    }

    return new Response(
      JSON.stringify({ message: `Successfully synced ${upsertPayload.length} entries.` }),
      { headers: { "Content-Type": "application/json" } },
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
})