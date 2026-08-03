ALTER TABLE public.agent_memories
  DROP CONSTRAINT IF EXISTS agent_memories_agent_id_check;

ALTER TABLE public.agent_memories
  ADD CONSTRAINT agent_memories_agent_id_check
  CHECK (
    agent_id IN (
      'shared',
      'nina',
      'jade',
      'iris',
      'clara',
      'violeta',
      'sofia',
      'bella',
      'cora',
      'elisa',
      'maia'
    )
  );
