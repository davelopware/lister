---
name: lister
description: "Use for structured list memory with typed schemas. Triggers: backlog, queue, todo, worklist, triage, contacts, habits, shopping, health-log, waiting-on. Commands: commandGetAll, commandGet, typeGetAll, typeGet, listCreate, listsGet, itemCreate, itemGetAll, itemRemove, itemUpdate, listClear, listRemove, status."
argument-hint: "function name and JSON args"
user-invocable: true
---

# Lister Skill

## Use When
- You need local, deterministic, structured memory for list-like data.
- You want strict schemas per list type and positional item IDs.
- You want to manage multiple lists with different purposes and structures.
- You want to inspect and manipulate list contents with a rich command surface.

## Built-in Types
- general: text
- todos: text, due, status
- people: nickname, name, email, phone, relation, birthday, additional
- habits: habit, frequency, target, progress, last_completed, streak, notes
- shopping-items: item, quantity, category, store, budget, status
- health-log: metric, value, unit, recorded_at, context, notes
- waiting-on: subject, owner, requested_at, due_by, status, next_follow_up

## Operating Rules
1. NEVER manipulate store files directly. Only use lister tool commands to ensure store integrity.
2. Always provide list name for mutating calls: listCreate, itemCreate, itemRemove, itemUpdate, listClear, listRemove.
3. List names: 1-64 chars, lowercase `a-z`, `0-9`, `-`, `_`; must start with `a-z` or `0-9`.
4. Read & write data as flat JSON objects matching selected list type schema.
5. IDs are 1-based positions; itemCreate with id inserts and reindexes down. inserts, updates and removes can cause ids to change.
6. listClear and listRemove require confirm: true.
7. typeGetAll() returns available list types and descriptions.
8. typeGet({ listTypeName }) returns list type field schema; check before listCreate, itemCreate, or itemUpdate if schema not already known.
9. Custom list types can be added in `lister-store/_config/custom-list-types.json`. follow the same structure as `dist/builtin-list-types.json`.

## Recommended Call Order
1. commandGetAll() to discover available commands.
2. commandGet({ "commandName": "..." }) gets exact arguments for one command.
3. typeGetAll() to discover list type names.
4. typeGet({ "listTypeName": "..." }) get field schema for specific list type.
5. listCreate({ list, listType, description }) creates new list.
6. listsGet() get list items and metadata.
7. listRemove({ list, confirm }) removes a list and all of its items.
8. itemCreate({ list, data }) or itemCreate({ list, id, data }) to create new item.
9. itemGetAll({ list, limit? }) get all items in a list.
10. itemUpdate({ list, id, data }) or itemRemove({ list, id }) to change or remove a list item.
11. status() for store path/existence and aggregate summary.

## Minimal Examples

### Inspect The Available Commands
- commandGetAll() to get the possible commands then
- commandGet({"commandName":"itemCreate"}) to understand the arguments for the command you choose.

### Create A New List
- typeGetAll() to get the possible list types then
- typeGet({"listTypeName":"todos"}) to understand the schema for the list type you choose then
- listCreate({"list":"tasks","listType":"todos","description":"Delivery commitments"}) to create the list

### Add An Item To A List
- itemCreate({"list":"tasks","data":{"text":"Ship MVP","due":"2026-05-01T09:00:00Z","status":"open"}}) to add a new item to the end of the list OR
- itemCreate({"list":"tasks","id":1,"data":{"text":"Urgent","due":"2026-04-20T09:00:00Z","status":"open"}}) to insert a new item at position with specified id

### Get The Items In A List
- itemGetAll({"list":"tasks","limit":10}) to get all the items in the list (or up to a limit if specified)

### Update An Item In A List
- itemGetAll({"list":"tasks","limit":10}) to figure out the id of the item you want to update then (if you don't already know)
- itemUpdate({"list":"tasks","id":2,"data":{"text":"Updated","due":"2026-05-03T09:00:00Z","status":"open"}}) to update the item with specified id

### Remove An Item From A List
- itemGetAll({"list":"tasks","limit":10}) to figure out the id of the item you want to remove then (if you don't already know)
- itemRemove({"list":"tasks","id":3}) to remove the item with specified id

### Empty A List
- listClear({"list":"tasks","confirm":true}) to remove all items from the list (but keep the list itself)

### Remove A List
- listRemove({"list":"tasks","confirm":true}) to remove entire list and all its items

### Get The Overall Status Of The Lister Plugin
- status() to get information about the store path, whether the store exists, and total count of lists and list items.

## References
- Tool manifest: [../../tools/lister.tool.json](../../tools/lister.tool.json)
