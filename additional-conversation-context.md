---
created: 2025-08-19
modified: 2025-08-20
connections:
published:
source: https://claude.ai/chat/c23e26df-635e-4614-865a-4f70d987f736
title: Obsidian Kanban Plugin Design
---
Can you help me write a design document for a kanban plugin for Obsidian? I have a jumble of ideas that I need to straighten out so I can provide thorough instructions for a coding agent.

Some guidelines for this chat: 1. Err on the side of asking "too many" questions. I'm keen for this to be collaborative and need you to be a good sounding board. 2. Keep an eye out for any gaps I'm leaving. In essence, you should "red team" my ideas - what might the edge cases be? What implicit steps or aspects am I skipping over? 3. When it comes time to "commit pen to paper" as it were and compile parts of the design doc, focus on making it modular - such that it can be tackled in bite-sized chunks.

So, with that - my first prompt for you: what am I missing from this briefing? What else should I include now to set us up for success?

---

This is a great start! I'm excited to help you build out a thorough design document. You've set good collaborative guidelines, and I can already see this will need some structured thinking to turn your ideas into actionable specs.

Here's what I think we're missing from the briefing to set us up for success:

**Core Scope & Vision**

- What's your high-level vision for this kanban plugin? Basic task boards, or something more sophisticated?
- Are there specific pain points with existing Obsidian workflows you're trying to solve?

**User Context**

- Who are your target users? (Students, project managers, writers, researchers?)
- What are the key use cases you want to support?
- How do you envision this fitting into someone's daily Obsidian workflow?

**Technical Landscape**

- Are you familiar with existing kanban plugins for Obsidian? What do you like/dislike about them?
- Any technical constraints or preferences for the implementation?
- How should this integrate with Obsidian's core features (linking, tags, search, etc.)?

**Success Criteria**

- What would make this plugin genuinely useful vs. just another kanban board?
- Any must-have vs. nice-to-have features in your mind?

**Data & Persistence**

- How should the kanban data be stored? (Markdown files, JSON, integration with existing notes?)

Before we dive deeper - what's driving this project for you? Is this solving a personal workflow problem, or are you building for a broader community need? Understanding your motivation will help me ask better questions and spot the right gaps.

---

OK, here's what I've got so far - I think it addresses most of these prompts, though I only half-baked the "drag and drop" point below, despite it being a very-nice-to-have feature. Thoughts?

//

# Overall context

At its core, what I'm trying to do is make my own ideal kanban/task management plugin for Obsidian. What's driving this is that there are a number of plugins in this space that all approach it slightly differently, and I find myself wishing that there was one plugin with subsets of all of their features.

## User context

Accordingly, my target user is just - me! I use Obsidian to capture information and thoughts about all aspects of my life. So, there are three main use cases:

1. Using tasks that are captured in-situ across the vault.

I use the Tasks plugin (https://github.com/obsidian-tasks-group/obsidian-tasks) to format my tasks with emojis denoting fields (e.g. the heavy plus emoji denotes the date a task was added). I capture those tasks on the pages they relate to or originate from; for instance, a meeting will have its own note, and there might be action items that arise, and I find the most ergonomic workflow to be to capture those tasks directly in the notes. Similarly I have my daily note set to open on start-up for quickly capturing thoughts as they occur to me, so I have miscellaneous tasks captured across days' notes. I can elaborate on _why_ I find this workflow 'ergonomic', but I don't think it'll be directly helpful for building it.

2. Letting me create multiple views over those tasks, based on context / other information. This will be in kanban format.

I want to organise my tasks by two main dimensions: context and status.

The context relates to the 'all aspects of my life' alluded to above: I use tags to denote the context of a task, which is to say _when_ I should be looking at it. I'm currently using one tag with subtags: `#for/home` denotes tasks relating to things I have to do around the house, for life admin, and so on; `#for/work` denotes tasks relating to my professional life; and `#for/hobbies` denotes tasks relating to my hobbies and leisure. So, one _kind_ of view that needs to be supported is efficiently zooming in on just one context at a time, so that when I'm at the office or otherwise in dedicated focused work time, I can just look at what I'm trying to do using that time (ditto the other contexts).

The status tags track kanban status. I'm erring on the side of fewer rather than more - `#in/backlog`, `#in/wip`, `#in/blocked` for now. So I want a kanban board that lets me look at this at a glance in columns.

The boards/views need to be extensible and reconfigurable in case I want to modify this in future, however. I should be able to easily add, remove, or redefine contexts and statuses and the boards and how they are arranged.

I also want filters to be quite advanced: this is a technical limitation baked in to the other plugins in the space, which I'll cover below.

3. Doing minimum task management efficiently from within the board view, rather than having to jump in and out between notes where the tasks reside.

The most obvious example here is completing tasks: the checkbox should appear on the cards, and checking them should update the task in its parent file as well as the visual components on the board. 

Efficiency is key here - so a drag-and-drop system will be ideal. (More on this later.)

## Technical landscape

### Alternatives

There are three main kanban-from-markdown plugins I'm interested in:

**CardBoard** (https://github.com/roovo/obsidian-card-board)

Pros:
- Aggregates tasks from across the vault

Cons:
- Other than completion, no ability to edit tasks from the board
- Can't rearrange cards on the fly / manually
- Not actively developed anymore

**Kanban** (https://github.com/mgmeyers/obsidian-kanban)

Pros:
- Slick drag-and-drop
- Edit task text directly on a card

Cons:
- Limited support for Tasks plugin (e.g. no completion date automation)
- All tasks reside on one file (boards and files are one-to-one)

**Task Board** (https://github.com/tu2-atmanand/Task-Board)

Pros:
- Under active development
- Is attempting to bring together the best of CardBoard and Kanban

Cons:
- Not yet fully featured

---

This is excellent foundational work! You've painted a clear picture of your workflow and the gap you're trying to fill. I can see how the existing plugins each solve part of your puzzle but none quite nail the whole thing.

A few observations and questions to help flesh this out:

**On the incomplete sections:**

1. **Drag & Drop** - This seems crucial for your efficiency goal. Are you thinking:
    - Drag to reorder within a column (manual prioritization)?
    - Drag between columns to change status tags automatically?
    - Drag to different board views to change context tags?
2. **Obsidian Integration** - Given your workflow, I'm curious about:
    - When you're viewing a task on a board, should you be able to quickly jump to its source note?
    - How should task links (to other notes/people) render on cards?
    - Should the board respect Obsidian's search/filter syntax for advanced filtering?

**Red-teaming your approach:**

3. **Tag Conflicts** - What happens if a task has multiple context tags (`#for/work` AND `#for/home`)? Does it appear on multiple boards?
4. **Tag Changes** - If you edit a task's tags in its source note, should it automatically move between board columns/views in real-time?
5. **Untagged Tasks** - How should the plugin handle tasks that don't fit your tagging scheme? Ignore them? Show them in a catch-all category?
6. **Performance** - Have you thought about vault scanning performance? With tasks scattered across many notes, how often should the plugin re-scan for changes?
7. **Board Configuration** - How do you envision creating/modifying these board views? A settings panel? YAML frontmatter? Something else?

What's your take on these edge cases? And should we start sketching out the data model before diving into the incomplete sections?

---

Great feedback. Working through these:

1. Drag and drop

The MVP here is, as you say, dragging between columns to change status tags automatically. I think that's the minimum required for a proper kanban experience (like you get in things like Trello - maybe some of these non-Obsidian-plugin options are good touchpoints too).

Reordering *within* a column would be great for manual prioritisation, yes! I suspect that goes one rung up the ambition ladder, as it'll need additional context to be added to the task itself on its parent file - maybe you'd need to have something like `↕️ 12` - and some kind of maybe-tricky-to-implement logic about updating that.

Ah, talking \*that \*through reveals another principle I'd like to adhere to: minimising footprint for any given action. More concretely, 'edits' to one task should ideally only touch that one task: so reording things like above should only edit the task being dragged, which precludes updating the order on all the non-dragged tasks.

I think there would be UIs where dragging between board views to change context would make sense - like maybe if you had tabs at the top of the view that show what board you're on and let you switch to other boards, dragging a card to one of those tabs updates its context. However, I think that's probably a rare enough use case for me personally that I don't really care about supporting it. (I could imagine it being an extension feature that others might want if this were ever shared more widely.)

2. Obsidian integration

These are good nudges - I hadn't though that hard about *all* of Obsidian's features. 
- Yes, you should be able to quickly jump to a task's source note.
	- This is a good callout: CardBoard does this with some good and some annoying elements - it always opens the source note in a new tab and splits the pane, which is annoying (I prefer just opening in a new tab, rather than messing with my view) *but* it also jumps to the *line* of the task in that note (unlike the other plugins, which don't "know" where the task is).
	- This actually also adds more context about data persistence, uniqueness of tasks, and some practical methods for updating tasks: CardBoard at various points in its code uses hashes of filepaths and line numbers as IDs for tasks, so those will all be pieces of the puzzle here. (Consider that two files can't have the same file path (i.e. including the filename), and two tasks can't be on the same line in the file!)
- Ideally I think info on a card should render the same as it would elsewhere in Obsidian - so ideally it's using the same styles I'm using for the whole vault, inline links appear the same, so on and so forth.
- Filtering I am unsure about. 
	- Consistency in search/filter would be *cute*, but I think (1) the effort of doing that might not be worth it, and (2) I actually think Obsidian's in-built file search and even some of the embedded query stuff isn't *quite* built for our use-cases - many things operate only at the file-level, for instance, while we're mostly working at basically the block level. 
	- On the topic: a con of *all* the other kanban plugins is that their board-level and column-level filtering is very basic. Where they let you filter tasks by tags, it's always positive-only (i.e. you can't define things by just *excluding* tags); there's no boolean logic (so you can't filter for 'includes both tag X and Y'); and only Task Board supports multiple tags at the board level (though this is always an OR - no actual usable logic). One potential thing I'm interested in here is maybe just allowing arbitrary Javascript functions - high-risk, high-effort, but high-precision and therefore high-reward... But I'm very unsure about best approach here.

3. Tag conflicts and 5. Untagged Tasks

Good question. CardBoard and Task Board both have "Other Tags" and "Untagged" column types; in this instance, their very basic tag-defined columns (no logic etc.) make it easier for them to have a pre-defined column that says "anything that doesn't include one of the column-defining tags". In both cases their Untagged column is basically useless to me, unfortunately, as I use a `#todo` tag in the Tasks plugin to manage which checklist items Tasks manages for me (adding completion dates on checking them, that sort of thing) - and this means that none of my tasks are Untagged.

So, to answer (3): yes, I think they should appear in multiple places. That's probably true for the 'status' tags as well - probably a task should appear anywhere (and indeed everywhere) it matches criteria. That also means we don't have to worry about enforcing uniqueness, handling some edge cases etc.

To answer (5), I think untagged should just be a special case of tagged: I want board- and column-definition logic to be sufficiently robust that I can just have 'empty/null tags' as a case I can use. So no special Untagged column - just on some boards, I may choose to add a column I call "Untagged" which matches tasks with no tags.

4. Tag changes and 6. Performance

Easy: yes, it should automatically move and update in real time. That's probably *not* easy to implement, however.

I think CardBoard implements it by having an update tick every ~1-2s, and I think it might be rescanning *all* files (though maybe with some caching/memoisation based on last updated time?) as it does warn that large vaults might cause poor performance.

Conversely, Task Board requires one big scan on install/major update, and otherwise seems to "watch" for updates - so maybe it's adding hooks on certain Javascript events across Obsidian. A more incremental approach versus CardBoard's more stateless (?) one. (Not sure if that's the best way to describe that!)

I am yet to actually encounter any poor performance in CardBoard on any of my devices (desktop, laptop, phone) so I would prefer to go with whichever approach is more straightfoward to implement / more maintainable etc.

7. Board config

Both CardBoard and Task Board have you add boards in the plugin settings menu, and then within each board you define columns - there are Add and Delete buttons, there's a dropdown for the "type" of column (Dated vs Tagged vs these other special kinds I've alluded to), and then there are minimal UI controls to set up the ~filter - for Tagged, it's just a text box where you enter the tag you want to positive match; for Dates it's a couple of elements so you can define relative date ranges.

This surfaces a few things:
- I am really laser-focused on tags right now, and am not really interested in adding support for date-based columns. 
	- However, displaying dates (due, scheduled, created, etc.) is important, and it would be nice to have the option to sort by date - maybe as a run-once function that applies a manual ordering based on a calculated ordering, so I can retain the best of both worlds. 
	- This is another limitation of CardBoard: it only works on Due dates. Task Board lets you pick *which* kind of date you want to use (though globally across the plugin, rather than per-board or per-column or anything). 
- I mentioned special kinds of columns: one of the other special kinds I haven't mentioned yet is the Done/Completed column, which filters especially for completed checklist items (instead of tags etc. - though it's still subject to board-level filters). I do want to retain this functionality, and *ideally* I could either check an item or, in the drag-and-drop system, drag-and-drop a card on the column *to* check it off.

Anyway, I'm happy to mimic the settings approach.

---

Fantastic detail! You're clearly thinking like a product manager here - understanding the existing solutions deeply and identifying the precise gaps. This gives us a really solid foundation.

Let me pull out some key design decisions that are crystallizing:

**Core Architecture Decisions:**

- Task identity: filepath + line number (following CardBoard's approach)
- Real-time updates preferred
- Tasks can appear in multiple columns if they match multiple criteria
- Settings-based board configuration
- Minimal footprint edits (only touch the task being changed)

**A few follow-up questions on the trickier bits:**

**Advanced Filtering Logic:** You mentioned the JavaScript function idea for filtering - that's powerful but as you noted, high-risk. What about a middle ground? Something like a simple query syntax that supports:

- Boolean operators: `#work AND #urgent`
- Exclusion: `#work AND NOT #someday`
- Parentheses: `(#work OR #personal) AND #urgent`

Would that cover your use cases without the security/complexity of arbitrary JS?

**Manual Ordering Implementation:** For within-column reordering, you mentioned `↕️ 12` as an example. A few approaches:

- Fractional ordering (task gets `↕️ 1.5` when dragged between `↕️ 1` and `↕️ 2`)
- Timestamp-based (`↕️ 2024-08-19-14:30:15`)
- Simple increment (`↕️ next-available-number`)

Which feels most maintainable to you?

**Done Column Behavior:** When you drag a task to the "Done" column, should it:

- Just check the checkbox (keep all tags)?
- Check the checkbox AND remove status tags?
- Something else?

**Error Handling Edge Cases:**

- What if someone manually deletes a task from a note while the board is open?
- What if someone adds malformed tasks?
- What if files get renamed/moved?

Should we start sketching the data model and API surface before diving into UI specifics?

---

On advanced filtering logic:

Yes, that simple query syntax would work just fine. I think those three elements are about all we'd need. I was just worried about how much effort and complexity that would add - what do you think?

On manual ordering:

My intuition says the fractional ordering is the right approach; that maybe provides the most intuitive / straightforward method for interpolating when we insert a task between two others - simply taking the midpoint. There's still going to be some edge cases to deal with, like putting a card right at the start or right at the end.

On done column behaviour:

I think just check the checkbox. That aligns with our 'minimum modification' principle and reduces code complexity. Maybe one day I could run some analysis to see how often I complete tasks straight out of which column - e.g. whether I'm completing things in the backlog more than out of WIP (which would indicate some kind of bad habit / antipattern).

On error handling edge cases:

If someone manually deletes a task from a note while the board is open - I would expect that this should be treated like any other update, i.e. it's reflected visually in real time.

This is in some ways a subset of a problem which is adding/removing lines in files such that a task's line number changes. It strikes me as most straightforward, though maybe not without unintended consequences, that we should just treat this as basically a deletion and creation (for as long as we're not tying any actions/hooks to those 'events').

Like if there's a task on line 37 on file x, it gets read into "memory" as x:37, then I go off and edit the file to add a bunch of extra lines at the top, in practice the "same" task has moved from 37 to 52, but we can just act as though x:37 has disappeared and x:52 has appeared.

(Ditto if files get renamed - x:32 disappears and y:32 appears, no problem.)

For malformed tasks - I think we just abandon those on the read-in step, i.e. fail gracefully and move on. The user (me) will get visual feedback that this has happened, because the expected task won't be visible on the board. I suppose there might be some pernicious cases where maybe I add a malformed task somewhere, but don't look at the board until I've forgotten it exists and I don't have the sense that something's missing, but in the absence of any elegant suggestions for handling that I'm happy to wear that risk.

//

I hear that you're excited to get stuck into the data model and API surface, but let's just really make sure we've nailed down all the high-level stuff here. Any more questions arising from what I've said? Take a look back at what we've collected - any gaps or overlaps?

---

Good instinct - let's make sure we have the complete picture before diving deeper. Looking back at everything we've covered, I see a few remaining gaps:

**UI/UX Details:**

- **Card content**: Beyond the task text, what should appear on each card? Due dates? Creation dates? Priority indicators? Tags themselves?
- **Multi-board navigation**: How do you switch between your work/home/hobbies boards? Tabs? Dropdown? Separate command palette entries?
- **Mobile experience**: You mentioned using Obsidian on your phone - any special considerations for touch/small screen?

**Workflow Gaps:**

- **Task creation**: Can you create brand new tasks directly from the board view, or is it purely for managing existing tasks from your notes?
- **Task editing**: Beyond checking off and dragging, what about editing the actual text of a task from the card? Or adding/removing tags?

**Tasks Plugin Integration:**

- You mentioned the Tasks plugin handles completion date automation when you check things off. Should your kanban plugin trigger those same behaviors, or bypass them?
- Any other Tasks plugin features you rely on that need to be preserved?

**Technical Considerations:**

- **Undo/redo**: If someone accidentally drags a task, how do they undo it?
- **Validation**: What if someone drags a task to a column that would create conflicting tags (like if a column required `#urgent` but the task already had `#someday`)?

**Edge Cases:**

- **Long task titles**: Truncation strategy for cards?
- **Multi-line tasks**: How should those render/behave?

Are any of these worth diving into now, or should we table them for later phases?

---

Yeah, we may as well handle them now.

**UI/UX**
- Card content: I want to align with CardBoard here, mostly. 
	- It should be task title, then subtasks/description, which in CardBoard just means rendering any list/checklist sub-items under the main parent item. This is a very nice feature - it means I can Tasks nested under the main Task (i.e., things that are formatted by the Tasks plugin) as well as extra info that I want to refer back to quickly (i.e. in just a non-checklist list item). 
	- We'll want to render the checkbox itself as well...
	- ...and maybe the tags - possibly as some nice-looking chips. CardBoard lets you click those to open Obsidian's file search to search for those tags, but I haven't actually ever used that feature. Like CardBoard and Task Board, we'll want to have settings to show/hide filter and definition tags - for instance, seeing every card with `#todo` on it is just noise. 
	- Dates should show up as well. I don't have a strong sense of how to handle those; maybe just lines in the footer for any dates that exist, in the Tasks format, e.g. `➕ 2025-08-10 ⏳ 2025-08-20 📅 2025-08-26` just all in succession. (Maybe with some options to show/hide these - maybe in the settings.) 
- Multi-board navigation: both CardBoard and Task Board are fundamentally just tabset panes where the pane is the current board and the tabs are the boards. No need to reinvent the wheel! 
- Mobile experience: I think so long as we don't do anything *weird*, this should look fine on mobile. Both CardBoard and Task Board appear fine on mobile; I think just normal responsive design - with overflow on the board so I scroll left/right through columns - will be just peachy.

**Workflow gaps** 
- Task creation: I think no tasks from the board view. Task Board offers that, CardBoard doesn't; my workflow is very much note-first. 
- Task editing: great question. I think I want three behaviours: 
	- An edit button bottom right, which triggers the Tasks modal (via its API) to edit task details. This covers core details like dates and the task title. 
	- Some sort of Jump To button, which opens the underlying note in a new tab and jumps to the task line (vs just starting at the top of the note). This then gives me the option to read more context around it or to edit the subtasks/sublist items. 
	- A delete button. This shouldn't actually delete the task, but instead do either the CardBoard thing of enclosing the task in `<del>` tags, or the Task Board thing of commenting it out (using `%%` markdown comments). I'm not sure if one of those is "better" - open to suggestions.

**Tasks Plugin Integration**

- Yes, the kanban plugin should trigger the Tasks behaviours. Looking at the Tasks API documentation ([https://publish.obsidian.md/tasks/Advanced/Tasks+Api#%60executeToggleTaskDoneCommand%20(line%20string,%20path%20string)%20=%3E%20string;%60](https://publish.obsidian.md/tasks/Advanced/Tasks+Api#%60executeToggleTaskDoneCommand%20\(line%20string,%20path%20string\)%20=%3E%20string;%60)) it looks like that should be fairly straightforward.
- No other Tasks plugin features - the rest is just about what formats things should be in (i.e. the fields-denoted-by-emojis). Those are all available here in the Tasks documentation: [https://publish.obsidian.md/tasks/Reference/Task+Formats/Tasks+Emoji+Format](https://publish.obsidian.md/tasks/Reference/Task+Formats/Tasks+Emoji+Format)

**Technical considerations**

- Undo/redo drag-and-drop: not required. Ditto any other undo/redo behaviour (which is why the "don't actually delete content" is important, because it means anything can be undone/redone manually if required). Neither CardBoard nor Task Board offer any undo/redo and that hasn't been a pain point for me.
- Validation: I don't think there's anything required here because we're not creating any opportunity for logic to 'conflict'. Ah, maybe one thing: the drag-and-drop functionality specifically should probably *remove* source tags while adding destination tags - in essence because DnD is intuitively a skeuomorphic operation: if I was doing this with a physical post-it note, it wouldn't leave a copy behind.

**Edge cases**

- Long task title should just render - even if it creates very 'tall' cards. This is on the user.
- Multi-line tasks: these don't seem to be supported in CardBoard/Task Board; I think tasks with newline characters "in" them are just not parsed / error on parse (and are thus skipped). I think we just treat that likewise.

---

Before I structure this into a formal design document, I have a few questions to ensure we capture everything a coding agent would need:

## Technical Implementation Questions

**1. Board Configuration Storage**

- Where should board configurations be stored? In a single plugin settings file, or as separate markdown files in a specific folder?
- Should board configurations be portable/shareable between vaults?

**2. Plugin Architecture**

- Any preference for the rendering approach? (React components, vanilla JS, Svelte like some Obsidian plugins use?)
- Should this use Obsidian's built-in CSS variables for theming, or have its own style system?

**3. API/Extension Points**

- Do you envision other plugins being able to interact with this one?
- Should there be any keyboard shortcuts for common operations?

**4. Data Caching Strategy**

- For the task scanning: should we cache parsed tasks in memory, or re-parse on each render?
- Any preference on how to handle the file watcher implementation?

## Feature Clarifications

**5. Column Definition Logic**

- For your filtering syntax (`#work AND NOT #someday`), should this be available at both board AND column level?
- Can a column have NO tag criteria (show all tasks regardless of tags)?

**6. Fractional Ordering Edge Cases**

- What happens when fractional ordering numbers get too precise (like after many reorderings)? Should there be a "rebalance" operation?
- Should the order persist if you change views/boards and come back?

**7. Visual Indicators**

- Should cards show any visual indication of which board/column they "belong" to vs where they currently are?
- Any color coding or visual priority system needed?

## Documentation Structure

**8. For the design doc itself:**

- Would you prefer a single comprehensive document, or multiple docs (architecture, UI specs, implementation guide)?
- Should I include pseudocode/interface definitions, or keep it more conceptual?
- Do you want explicit "MVP vs Future" delineation for features?

Once we clarify these, I can structure everything into a clean, modular design document that gives your coding agent clear implementation guidance while preserving all the "why" context you've thoughtfully developed.

---

Great details to clarify, thanks for asking!

1. Board config storage

I think as with CardBoard, Task Board, and in general many other Obsidian plugins, this should all be stored in the `data.json` plugin file. That covers off the portability and shareability as well: Obsidian Sync handles that based on user preferences about what plugin data to sync.

2. Plugin architecture

I'm totally agnostic on tech stack here; looking at the Obsidian documentation for plugin dev ([https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)) it looks like you're right that vanilla, React or Svelte are the main options. What do you think is likely to be best, given what we're trying to achieve and what's likely well-understood by coding agents?

I do think this should use Obsidian's built-in CSS as much as possible, yes. I'm keen to avoid reinventing the wheel, spending too much time in tweaking exact look-and-feel, and keeping it as consistent as possible with the rest of my Obsidian experience.

3. API / extension

At present, no, not expecting any interaction. It's a good though though - maybe later down the track.

I don't think I need any keyboard shortcuts for things; this will be very mouse-driven.

4. Data caching

Good question; I may have mentioned that my understanding is CardBoard does one and Task Board the other, though that may be incorrect. What will be most straightforward to implement? I expect on some level we'll _have_ to have some kind of cache in memory, if only as some kind of array that we'll need to map over for some of the steps.

No preference on file watcher implementation: just keep it as simple as possible.

5. Column definition logic

Good catch: yes, filtering syntax should be both board and column level, ideally with substantial code reuse between the two (e.g. it's fundamentally one function called in different contexts).

6. Fractional ordering edge cases

Damn, this one's tough. Can you formulate this as a self-contained problem/question that I can shop around a bit before committing?

Order should indeed persist on changing views/boards, which is why I think this needs to end up embedded in the task text itself on-disk (with an emoji flag to keep in the Tasks plugin style).

7. Visual indicators

Hm, I'm not quite sure what you mean about belonging to a column vs being somewhere else. If they've been moved via e.g. drag-and-drop, they should both _be_ and _belong_ where they now are. Could you elaborate on this?

CardBoard and Task Board both have some colour coding based on a date (CardBoard: just due date; Task Board: configurable to be (globally) due or scheduled or some other date). Personally I've always found this to be just visual clutter, so I'm comfortable with skipping this. (It can always go on the roadmap later.)

8. Design doc design

I am open to either side of each of your dichotomies. If _you_ had to implement this, what would _you_ prefer for each of those questions?

---

Thanks for the clarifications! Let me address your questions and then propose a doc structure.

## My Recommendations

**Tech Stack:** I'd recommend **vanilla TypeScript** for this project. Reasoning:

- Most straightforward for coding agents to understand (no framework abstractions)
- Obsidian's API is well-documented for vanilla JS/TS
- Drag-and-drop is actually simpler to implement without framework overhead
- Easier to debug and maintain
- CardBoard uses vanilla JS successfully for similar functionality

**Visual indicators:** Sorry for the confusion - I was overthinking this. You're right, if a card moves, it belongs where it is. Ignore that question!

**Fractional Ordering Problem** (for you to shop around):

> **Problem:** Implement a manual ordering system for items in a list where:
> 
> - Items can be dragged between any two other items
> - Only the moved item's data should be modified (not its neighbors)
> - The order value must be stored as a string in the format `↕️ [value]`
> - The system must handle edge cases (beginning/end of list, repeated reorderings)
> 
> **Constraints:**
> 
> - Values should remain human-readable when possible
> - System should gracefully handle precision limits
> - Must work after hundreds of reorder operations
> 
> **Question:** What's the best approach? Fractional (1, 1.5, 1.75...)? Lexicographic ("a", "am", "az")? Other?

## Proposed Design Document Structure

I'd prefer a **single comprehensive document** with **interface definitions and key algorithms in pseudocode**. Here's why:

- Easier for the coding agent to search/reference everything in one place
- Clear information hierarchy helps with incremental implementation
- Pseudocode for complex parts (filtering, drag-and-drop) reduces ambiguity

Should I proceed with creating the design document with this structure:

1. **Executive Summary** (1 page max)
2. **Core Requirements & Principles**
3. **Architecture Overview** (with simple diagrams)
4. **Data Model** (with TypeScript interfaces)
5. **Feature Specifications**
    - MVP Features (clearly marked)
    - Future Enhancements (clearly marked)
6. **Implementation Modules** (bite-sized, ordered by dependency)
7. **Key Algorithms** (pseudocode for filtering, ordering, etc.)
8. **UI/UX Specifications**
9. **Testing Considerations**
10. **Appendix: Context & Decisions** (the "why" behind choices)

Would you like me to draft this now, or are there any other aspects you want to nail down first?

---

I'd just like to zoom in on the tech stack briefly - taking a look at the CardBoard repo on GitHub (linked somewhere in the original attachment IIRC) a lot of it is written in the Elm framework, which I'm totally unfamiliar with. Can you comment on that? If your other dot points hold then I think vanilla JS still sounds like the way to go - just wasn't sure if this datum was significant.

---

Great catch! You're absolutely right - CardBoard is indeed written in Elm, which is definitely significant context I missed. Let me search for more details about this.

You're absolutely right to flag this! CardBoard is indeed written primarily in Elm, which is quite significant. One of the reviewers even commented "amazing that you have the plugin mostly written in Elm!"

This changes the calculus considerably:

## Why this matters:

- **Elm is a functional programming language** that compiles to JavaScript - it has a completely different paradigm from vanilla JS/TS
- **Very niche expertise** - most developers (and coding agents) won't know Elm
- **Different ecosystem** - Elm has its own package manager, build tools, and patterns
- **Maintenance burden** - finding developers who can work with Elm is much harder

## Looking at the alternatives:

- **Kanban plugin**: Uses TypeScript/React
- **Task Board**: Uses vanilla JavaScript/TypeScript
- Both of these are mainstream choices that coding agents will understand

## My revised recommendation:

**Definitely go with vanilla TypeScript** for your implementation. The benefits:

- Coding agents will have extensive training data on TypeScript
- Much easier to maintain and extend
- Direct access to all Obsidian APIs without translation layers
- Simpler build process
- Better community support if you ever open-source it

The fact that CardBoard works well despite being in Elm shows the approach is solid, but for your goals (implementable by a coding agent, maintainable, extensible), TypeScript is the clear winner.
