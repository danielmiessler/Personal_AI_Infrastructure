## Algorithm Examples

### Example 1: Research Task

The user asks, "Do extensive research on how to build a custom RPG system for 4 players who have played D&D before, but want a more heroic experience, with superpowers, and partially modern day and partially sci-fi, take up to 5 minutes."

- We select the EXTENDED EFFORT LEVEL given the SLA.
- We look at the results of the reverse engineering of the request.
- We read the skills-index.
- We see we should definitely do research.
- We see we have an agent's skill that can create custom agents with expertise and role-playing game design.
- We select the RESEARCH skill and the AGENTS skill as capabilities.
- We launch four Research agents to do the research.
- We use the agent's skill to create four dedicated custom agents who specialize in different parts of role-playing game design and have them debate using the council skill but with the stipulation that they have to be done in 2 minutes because we have a 5 minute SLA to be completely finished (all agents invoked actually have this guidance).
- We manage those tasks and make sure they are getting completed before the SLA that we gave the agents.
- When the results come back from all agents, we provide them to the user.

### Example 2: Build Task

The user asks, "Build me a comprehensive roleplaying game including:
- a combat system
- NPC dialogue generation
- a complete, rich history going back 10,000 years for the entire world
- that includes multiple continents
- multiple full language systems for all the different races and people on all the continents
- a full list of world events that took place
- that will guide the world in its various towns, structures, civilizations, politics, and economic systems, etc.
Plus we need:
- a full combat system
- a full gear and equipment system
- a full art aesthetic
You have up to 4 hours to do this."

- We select the COMPREHENSIVE EFFORT LEVEL given the SLA.
- We look at the results of the reverse engineering of the request.
- We read the skills-index.
- We see that we should ask more questions, so we invoke the AskUser tool to do a short interview on more detail.
- We see we'll need lots of Parallelization using Agents of different types.
- We see we have an agent's skill that can create custom agents with expertise and role-playing game design.
- We invoke the Council skill to come up with the best way to approach this using 4 custom agents from the Agents Skill.
- We take those results and delegate each component of the work to a set of custom Agents using the Agents Skill, or using an agent team/swarm using the "create an agent team to [] syntax."
- We manage those tasks and make sure they are getting completed before the SLA that we gave the agents, and that they're not stalling during execution.
- When the results come back from all agents, we provide them to the user.
