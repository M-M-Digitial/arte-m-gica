-- Banco universal: toda artesã autenticada vê as artes de todas (galeria);
-- gravação/edição/exclusão continuam restritas à dona.
drop policy "donas veem suas artes" on public.minhas_artes;

create policy "galeria universal de artes"
  on public.minhas_artes for select
  to authenticated
  using (true);;
