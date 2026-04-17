import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { verifyToken, checkAdmin } from '../middleware/auth';
import { Event } from '../types';

const router = Router();

// Get all events
router.get('/', verifyToken, async (req: Request, res: Response) => {
  try {
    const { data: events, error } = await supabase
      .from('events')
      .select('*')
      .order('start_date', { ascending: true });

    if (error) throw error;

    res.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Get events by date range
router.get('/range', verifyToken, async (req: Request, res: Response) => {
  try {
    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({ error: 'Start and end dates are required' });
    }

    const { data: events, error } = await supabase
      .from('events')
      .select('*')
      .gte('start_date', start as string)
      .lte('end_date', end as string)
      .order('start_date', { ascending: true });

    if (error) throw error;

    res.json(events);
  } catch (error) {
    console.error('Error fetching events by range:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Get single event
router.get('/:id', verifyToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: event, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json(event);
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// Create event (admin only)
router.post('/', verifyToken, checkAdmin, async (req: Request, res: Response) => {
  try {
    const { title, description, start_date, end_date, all_day, color } = req.body;

    if (!title || !start_date || !end_date) {
      return res.status(400).json({ error: 'Title, start_date, and end_date are required' });
    }

    const { data: event, error } = await supabase
      .from('events')
      .insert({
        title,
        description,
        start_date,
        end_date,
        all_day: all_day || false,
        color: color || '#00A191',
        created_by: req.user?.id,
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(event);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// Update event (admin only)
router.put('/:id', verifyToken, checkAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, start_date, end_date, all_day, color } = req.body;

    const updateData: Partial<Event> = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (start_date !== undefined) updateData.start_date = start_date;
    if (end_date !== undefined) updateData.end_date = end_date;
    if (all_day !== undefined) updateData.all_day = all_day;
    if (color !== undefined) updateData.color = color;

    const { data: event, error } = await supabase
      .from('events')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json(event);
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// Delete event (admin only)
router.delete('/:id', verifyToken, checkAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

export default router;
