# META II

Alan Kay said implementing META II "is a test for graduate students". I thought it would be fun and educational to implement and play around with it.

There is a fantastic [tutorial by James Neighbors](http://www.bayfronttechnologies.com/mc_tutorial.html) that I highly recommend going through. The code in this repo was based on the code found in the [workshop page](http://www.bayfronttechnologies.com/mc_workshop.html).

Note, this project here is a WIP. It does currently work (it can compile itself, for example) but there is more to do. I will fill out more info on this readme about how to run it once it is more complete.

----
## What is META II?
Meta II is compiler generator that can generate itself.

For more, see [Wikipedia](https://en.wikipedia.org/wiki/Markdown)

> META II is a domain-specific programming language for writing compilers. It was created in 1963-1964 by Dewey Val Schorre at UCLA. META II uses what Schorre called syntax equations. Each syntax equation is translated into a recursive subroutine which tests the input string for a particular phrase structure, and deletes it if found.

----
## Implementation Details
To implement META II as described in the [1964 paper by Schorre](https://dl.acm.org/citation.cfm?doid=800257.808896), one simply has to implement ~20 opcodes, using a basic interpreter/emulator scheme. I had some previous experience with this when implementing a [Chip-8 emulator](https://github.com/evanhackett/chip8), so this basic technique was familiar to me.

To kill two birds with one stone, I chose this to be my project for a class on functional programming. That meant I had to reimplement META II in a functional way. My essential strategy here was to make it so that each opcode no longer mutates a global variable (registers, memory, stack, etc). Instead, each opcode returns a "state delta", and then in one place, on every interpreter cycle, I update the state using the state deltas. In this way side effects are isolated, and the core data-structures can be treated as immutable everywhere but in the one update function.
