import { kaiTodoService } from '../services/kai-todo';

export async function handleTodoRoute(
  url: URL,
  req: Request,
  headers: Record<string, string>
): Promise<Response | null> {
  const path = url.pathname.replace('/api/todo', '');

  // GET /api/todo - List all tasks
  if (req.method === 'GET' && (path === '' || path === '/')) {
    try {
      const tasks = await kaiTodoService.getTasks();
      return new Response(JSON.stringify(tasks), {
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: String(error) }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }
  }

  // POST /api/todo - Add new task
  if (req.method === 'POST' && (path === '' || path === '/')) {
    try {
      const body = await req.json();
      const { title, priority, skill, notes, autonomous, recurring, model } = body;

      console.log('[Todo API] Add task request:', JSON.stringify({ title, priority, skill, notes, autonomous, recurring, model }, null, 2));

      if (!title) {
        return new Response(JSON.stringify({ error: 'Title is required' }), {
          status: 400,
          headers: { ...headers, 'Content-Type': 'application/json' },
        });
      }

      const task = await kaiTodoService.addTask(title, { priority, skill, notes, autonomous, recurring, model });
      return new Response(JSON.stringify(task), {
        status: 201,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: String(error) }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }
  }

  // PUT /api/todo/:id - Update task
  const updateMatch = path.match(/^\/([^/]+)$/);
  if (req.method === 'PUT' && updateMatch && !path.includes('/status')) {
    try {
      const id = updateMatch[1];
      const body = await req.json();
      const { title, priority, skill, notes, autonomous, recurring, model } = body;

      const success = await kaiTodoService.updateTask(id, {
        title,
        priority,
        skill,
        notes,
        autonomous,
        recurring,
        model,
      });

      if (!success) {
        return new Response(JSON.stringify({ error: 'Task not found' }), {
          status: 404,
          headers: { ...headers, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: String(error) }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }
  }

  // PUT /api/todo/:id/status - Update task status
  const statusMatch = path.match(/^\/([^/]+)\/status$/);
  if (req.method === 'PUT' && statusMatch) {
    try {
      const id = statusMatch[1];
      const body = await req.json();
      const { status } = body;

      if (!['queued', 'in_progress', 'completed'].includes(status)) {
        return new Response(JSON.stringify({ error: 'Invalid status' }), {
          status: 400,
          headers: { ...headers, 'Content-Type': 'application/json' },
        });
      }

      const success = await kaiTodoService.updateTaskStatus(id, status);

      if (!success) {
        return new Response(JSON.stringify({ error: 'Task not found' }), {
          status: 404,
          headers: { ...headers, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: String(error) }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }
  }

  // DELETE /api/todo/:id - Delete task
  const deleteMatch = path.match(/^\/([^/]+)$/);
  if (req.method === 'DELETE' && deleteMatch) {
    try {
      const id = deleteMatch[1];
      const success = await kaiTodoService.deleteTask(id);

      if (!success) {
        return new Response(JSON.stringify({ error: 'Task not found' }), {
          status: 404,
          headers: { ...headers, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: String(error) }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }
  }

  return null;
}
