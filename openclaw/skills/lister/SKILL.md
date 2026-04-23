---
name: lister
description: "Use for structured list memory with typed schemas. Triggers: backlog, queue, todo, worklist, triage, contacts, habits, shopping, health-log, waiting-on. Commands: showCommands, commandArgs, showListTypes, listTypeSchema, create, lists, add, items, remove, update, clear, status."
argument-hint: "function name and JSON args"
user-invocable: true
---

# Lister Skill

## Use When
- You need local, deterministic, structured memory for list-like data.
- You want strict schemas per list type and positional item IDs.

## Built-in Types
- general: text
- todos: text, due, status
- people: nickname, name, email, phone, relation, birthday, additional
- habits: habit, frequency, target, progress, last_completed, streak, notes
- shopping-items: item, quantity, category, store, budget, status
- health-log: metric, value, unit, recorded_at, context, notes
- waiting-on: subject, owner, requested_at, due_by, status, next_follow_up

## Operating Rules
1. Always provide list name for mutating calls: create, add, remove, update, clear.
2. List names: 1-64 chars, lowercase `a-z`, `0-9`, `-`, `_`; must start with `a-z` or `0-9`.
3. Use flat JSON objects that exactly match the selected list type schema.
4. IDs are 1-based positions; add with id inserts and reindexes down.
5. clear requires confirm: true.
6. showListTypes() returns the available list type names and descriptions.
7. listTypeSchema({ listTypeName }) returns the field schema for one list type; check before create, add, or update when the schema is not already known.
8. Custom list types can be added in `lister-store/_config/custom-list-types.json` which should follow the same schema structure as `dist/builtin-list-types.json`.

## Recommended Call Order
1. showCommands() if you need to discover the available command surface.
2. commandArgs({ "commandName": "..." }) if you need the exact arguments for one command.
3. showListTypes() if you need to discover list type names.
4. listTypeSchema({ "listTypeName": "..." }) if you need the field schema for a specific list type.
5. create({ list, listType, description }) if list may not exist.
6. lists() to inspect known lists and metadata.
7. add({ list, data }) or add({ list, id, data }) for insertions.
8. items({ list, limit? }) for reads.
9. update({ list, id, data }) or remove({ list, id }) for edits.
10. status() for store path/existence and aggregate summary.

## Minimal Examples
- showCommands()
- commandArgs({"commandName":"add"})
- showListTypes()
- listTypeSchema({"listTypeName":"todos"})
- create({"list":"tasks","listType":"todos","description":"Delivery commitments"})
- add({"list":"tasks","data":{"text":"Ship MVP","due":"2026-05-01T09:00:00Z","status":"open"}})
- add({"list":"tasks","id":1,"data":{"text":"Urgent","due":"2026-04-20T09:00:00Z","status":"open"}})
- items({"list":"tasks","limit":10})
- update({"list":"tasks","id":2,"data":{"text":"Updated","due":"2026-05-03T09:00:00Z","status":"open"}})
- remove({"list":"tasks","id":3})
- clear({"list":"tasks","confirm":true})

## References
- Tool manifest: [../../tools/lister.tool.json](../../tools/lister.tool.json)
