import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify user is authenticated
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, eventData, eventId } = await req.json();

    // Get Google Calendar access token
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');

    if (!accessToken) {
      return Response.json({ 
        error: 'Google Calendar no está conectado. Por favor, autoriza la integración primero.' 
      }, { status: 400 });
    }

    const calendarId = 'primary';

    // CREATE EVENT
    if (action === 'create') {
      const event = {
        summary: eventData.title,
        description: eventData.description || '',
        start: {
          dateTime: eventData.start,
          timeZone: 'America/Mexico_City',
        },
        end: {
          dateTime: eventData.end,
          timeZone: 'America/Mexico_City',
        },
        colorId: eventData.colorId || '1',
      };

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        return Response.json({ error: 'Error al crear evento en Google Calendar', details: error }, { status: 500 });
      }

      const createdEvent = await response.json();
      return Response.json({ eventId: createdEvent.id, success: true });
    }

    // UPDATE EVENT
    if (action === 'update' && eventId) {
      const event = {
        summary: eventData.title,
        description: eventData.description || '',
        start: {
          dateTime: eventData.start,
          timeZone: 'America/Mexico_City',
        },
        end: {
          dateTime: eventData.end,
          timeZone: 'America/Mexico_City',
        },
      };

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        return Response.json({ error: 'Error al actualizar evento', details: error }, { status: 500 });
      }

      return Response.json({ success: true });
    }

    // DELETE EVENT
    if (action === 'delete' && eventId) {
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok && response.status !== 404) {
        const error = await response.text();
        return Response.json({ error: 'Error al eliminar evento', details: error }, { status: 500 });
      }

      return Response.json({ success: true });
    }

    // LIST EVENTS
    if (action === 'list') {
      const { timeMin, timeMax } = eventData || {};
      
      const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`);
      url.searchParams.append('timeMin', timeMin || new Date().toISOString());
      if (timeMax) url.searchParams.append('timeMax', timeMax);
      url.searchParams.append('singleEvents', 'true');
      url.searchParams.append('orderBy', 'startTime');
      url.searchParams.append('maxResults', '100');

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        return Response.json({ error: 'Error al obtener eventos', details: error }, { status: 500 });
      }

      const data = await response.json();
      return Response.json({ events: data.items || [] });
    }

    return Response.json({ error: 'Acción no válida' }, { status: 400 });

  } catch (error) {
    console.error('Error in syncGoogleCalendar:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});