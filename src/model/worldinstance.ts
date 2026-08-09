// The world the main route plays. Importing this module builds and
// initializes it, so anything that only needs the World class or the
// session store should import those modules directly instead.

import { RecordingSession, sessionStore } from "./data/sessions";
import { World } from "./world";

// The default recording session: everything the live world does is
// snapshotted here, in the same format as generated sessions.
export const liveSession = sessionStore.add(new RecordingSession('Live world', 'live'));

export const world = new World({ session: liveSession });
world.initialize();
