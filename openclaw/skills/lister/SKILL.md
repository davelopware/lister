---
name: lister
description: "Use for structured list memory with typed schemas. Triggers: backlog, queue, todo, worklist, triage, contacts, habits, shopping, health-log, waiting-on. Commands: commandGetAll, commandGet, typeGetAll, typeGet, listCreate, listsGet, itemCreate, itemGetAll, itemRemove, itemUpdate, listClear, status."
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
1. Always provide list name for mutating calls: listCreate, itemCreate, itemRemove, itemUpdate, listClear.
2. List names: 1-64 chars, lowercase `a-z`, `0-9`, `-`, `_`; must start with `a-z` or `0-9`.
3. Use flat JSON objects that exactly match the selected list type schema.
4. IDs are 1-based positions; itemCreate with id inserts and reindexes down.
5. listClear requires confirm: true.
6. typeGetAll() returns the available list type names and descriptions.
7. typeGet({ listTypeName }) returns the field schema for one list type; check before listCreate, itemCreate, or itemUpdate when the schema is not already known.
8. Custom list types can be added in `lister-store/_config/custom-list-types.json` which should follow the same schema structure as `dist/builtin-list-types.json`.

## Recommended Call Order
1. commandGetAll() if you need to discover the available command surface.
2. commandGet({ "commandName": "..." }) if you need the exact arguments for one command.
3. typeGetAll() if you need to discover list type names.
4. typeGet({ "listTypeName": "..." }) if you need the field schema for a specific list type.
5. listCreate({ list, listType, description }) if list may not exist.
6. listsGet() to inspect known lists and metadata.
7. itemCreate({ list, data }) or itemCreate({ list, id, data }) for insertions.
8. itemGetAll({ list, limit? }) for reads.
9. itemUpdate({ list, id, data }) or itemRemove({ list, id }) for edits.
10. status() for store path/existence and aggregate summary.

## Minimal Examples

### Inspect The Available Commands
- commandGetAll()
  Output:
  ```json
  {
    "ok": true,
    "count": 12,
    "commands": [
      { "name": "commandGetAll", "description": "Show the available Lister commands and what they do." },
      { "name": "itemCreate", "description": "Add an item to a list, optionally inserting at a 1-based position." }
    ]
  }
  ```
- commandGet({"commandName":"itemCreate"})
  Output:
  ```json
  {
    "ok": true,
    "commandName": "itemCreate",
    "requiredArgs": [
      { "name": "list", "type": "string", "description": "List name to add the item to." },
      { "name": "data", "type": "object", "description": "Item payload that matches the list type schema." }
    ],
    "optionalArgs": [
      { "name": "id", "type": "number", "description": "1-based position to insert at. If omitted, append to the end." }
    ]
  }
  ```

### Create A New List
- typeGetAll()
  Output:
  ```json
  {
    "ok": true,
    "count": 7,
    "listTypes": [
      { "name": "general", "description": "A simple single-text-field list for generic notes and lightweight tracking." },
      { "name": "todos", "description": "Track tasks with text, due date, and status." }
    ]
  }
  ```
- typeGet({"listTypeName":"todos"})
  Output:
  ```json
  {
    "ok": true,
    "listTypeName": "todos",
    "count": 3,
    "fields": [
      { "name": "text", "type": "string", "description": "Task summary" },
      { "name": "due", "type": "datetime", "description": "Target completion time" },
      { "name": "status", "type": "string", "description": "Current task state" }
    ]
  }
  ```
- listCreate({"list":"tasks","listType":"todos","description":"Delivery commitments"})
  Output:
  ```json
  {
    "ok": true,
    "created": true,
    "list": "tasks",
    "list_type": "todos",
    "description": "Delivery commitments"
  }
  ```

### Add An Item To A List
- itemCreate({"list":"tasks","data":{"text":"Ship MVP","due":"2026-05-01T09:00:00Z","status":"open"}})
  Output:
  ```json
  {
    "ok": true,
    "list_type": "todos",
    "item": {
      "id": 1,
      "createdAt": "2026-04-24T12:00:00.000Z",
      "updatedAt": "2026-04-24T12:00:00.000Z",
      "data": {
        "text": "Ship MVP",
        "due": "2026-05-01T09:00:00Z",
        "status": "open"
      }
    }
  }
  ```
- itemCreate({"list":"tasks","id":1,"data":{"text":"Urgent","due":"2026-04-20T09:00:00Z","status":"open"}})
  Output:
  ```json
  {
    "ok": true,
    "list_type": "todos",
    "item": {
      "id": 1,
      "data": {
        "text": "Urgent",
        "due": "2026-04-20T09:00:00Z",
        "status": "open"
      }
    }
  }
  ```

### Get The Items In A List
- itemGetAll({"list":"tasks","limit":10})
  Output:
  ```json
  {
    "ok": true,
    "list": "tasks",
    "count": 2,
    "items": [
      {
        "id": 1,
        "data": {
          "text": "Urgent",
          "due": "2026-04-20T09:00:00Z",
          "status": "open"
        }
      },
      {
        "id": 2,
        "data": {
          "text": "Ship MVP",
          "due": "2026-05-01T09:00:00Z",
          "status": "open"
        }
      }
    ]
  }
  ```

### Update An Item In A List
- itemUpdate({"list":"tasks","id":2,"data":{"text":"Updated","due":"2026-05-03T09:00:00Z","status":"open"}})
  Output:
  ```json
  {
    "ok": true,
    "list": "tasks",
    "list_type": "todos",
    "item": {
      "id": 2,
      "data": {
        "text": "Updated",
        "due": "2026-05-03T09:00:00Z",
        "status": "open"
      }
    }
  }
  ```

### Remove An Item From A List
- itemRemove({"list":"tasks","id":3})
  Output:
  ```json
  {
    "ok": true,
    "list": "tasks",
    "removed": 3
  }
  ```

### Empty A List
- listClear({"list":"tasks","confirm":true})
  Output:
  ```json
  {
    "ok": true,
    "list": "tasks",
    "removed": 2
  }
  ```

### Get The Overall Status Of The Lister Plugin
- status()
  Output:
  ```json
  {
    "ok": true,
    "extension_version": "0.3.0",
    "store_path": "/workspace/lister-store",
    "store_exists": true,
    "custom_list_types_path": "/workspace/lister-store/_config/custom-list-types.json",
    "custom_list_types_exists": false,
    "lists": 1,
    "items": 0
  }
  ```

## References
- Tool manifest: [../../tools/lister.tool.json](../../tools/lister.tool.json)
