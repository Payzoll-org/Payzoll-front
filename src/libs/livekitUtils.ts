import { Room, RoomEvent, Track, LocalAudioTrack, createLocalAudioTrack } from 'livekit-client';
import { getApiBase, API_ROUTES } from '../config/apiConfig';

let currentRoom: Room | null = null;
let localAudioTrack: LocalAudioTrack | null = null;

export interface LiveKitConnectionOptions {
    roomName: string;
    participantName: string;
    onConnected?: () => void;
    onDisconnected?: () => void;
    onTrackSubscribed?: (track: Track) => void;
    onError?: (error: Error) => void;
}

/**
 * Fetch LiveKit access token from Gateway
 */
async function fetchLiveKitToken(roomName: string, participantName: string): Promise<{
    token: string;
    url: string;
    roomName: string;
    participantName: string;
}> {
    const gatewayUrl = getApiBase('gateway');
    const response = await fetch(`${gatewayUrl}${API_ROUTES.livekit.token}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ roomName, participantName }),
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch LiveKit token: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Create a LiveKit room on the server
 */
async function createLiveKitRoom(roomName: string): Promise<void> {
    const gatewayUrl = getApiBase('gateway');
    const response = await fetch(`${gatewayUrl}${API_ROUTES.livekit.createRoom}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ roomName }),
    });

    if (!response.ok) {
        throw new Error(`Failed to create LiveKit room: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[LiveKit] Room created:', data);
}

/**
 * Connect to a LiveKit room
 */
export async function connectToLiveKitRoom(options: LiveKitConnectionOptions): Promise<Room> {
    const { roomName, participantName, onConnected, onDisconnected, onTrackSubscribed, onError } = options;

    try {
        console.log('[LiveKit] Fetching token...');

        // Create room first
        await createLiveKitRoom(roomName);

        // Fetch token
        const { token, url } = await fetchLiveKitToken(roomName, participantName);
        console.log('[LiveKit] Token received, connecting to room...');

        // Create room instance
        currentRoom = new Room();

        // Set up event handlers
        currentRoom.on(RoomEvent.Connected, () => {
            console.log('[LiveKit] ✅ Connected to room:', roomName);
            onConnected?.();
        });

        currentRoom.on(RoomEvent.Disconnected, () => {
            console.log('[LiveKit] ❌ Disconnected from room');
            onDisconnected?.();
            cleanup();
        });

        currentRoom.on(RoomEvent.TrackSubscribed, (track, _publication, participant) => {
            console.log('[LiveKit] 📥 Track subscribed from:', participant.identity);
            onTrackSubscribed?.(track);

            // If it's an audio track from the agent, play it
            if (track.kind === Track.Kind.Audio) {
                const audioElement = track.attach();
                document.body.appendChild(audioElement);
                audioElement.play();
                console.log('[LiveKit] 🔊 Playing agent audio');
            }
        });

        currentRoom.on(RoomEvent.TrackUnsubscribed, (track, _publication, participant) => {
            console.log('[LiveKit] Track unsubscribed from:', participant.identity);
            track.detach();
        });

        currentRoom.on(RoomEvent.ParticipantConnected, (participant) => {
            console.log('[LiveKit] Participant connected:', participant.identity);
        });

        currentRoom.on(RoomEvent.ParticipantDisconnected, (participant) => {
            console.log('[LiveKit] Participant disconnected:', participant.identity);
        });

        // Connect to room
        await currentRoom.connect(url, token);

        return currentRoom;
    } catch (error) {
        console.error('[LiveKit] Connection error:', error);
        onError?.(error as Error);
        throw error;
    }
}

/**
 * Publish local audio track to the room
 */
export async function publishAudioTrack(): Promise<LocalAudioTrack> {
    if (!currentRoom) {
        throw new Error('Not connected to a room');
    }

    try {
        console.log('[LiveKit] Creating local audio track...');

        // Create local audio track with echo cancellation
        localAudioTrack = await createLocalAudioTrack({
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
        });

        // Publish to room
        await currentRoom.localParticipant.publishTrack(localAudioTrack);
        console.log('[LiveKit] ✅ Published local audio track');

        return localAudioTrack;
    } catch (error) {
        console.error('[LiveKit] Error publishing audio track:', error);
        throw error;
    }
}

/**
 * Unpublish local audio track
 */
export async function unpublishAudioTrack(): Promise<void> {
    if (!currentRoom || !localAudioTrack) {
        return;
    }

    try {
        await currentRoom.localParticipant.unpublishTrack(localAudioTrack);
        localAudioTrack.stop();
        localAudioTrack = null;
        console.log('[LiveKit] Unpublished local audio track');
    } catch (error) {
        console.error('[LiveKit] Error unpublishing audio track:', error);
    }
}

/**
 * Mute/unmute local audio
 */
export async function setMicrophoneMuted(muted: boolean): Promise<void> {
    if (!localAudioTrack) {
        console.warn('[LiveKit] No local audio track to mute/unmute');
        return;
    }

    if (muted) {
        await localAudioTrack.mute();
    } else {
        await localAudioTrack.unmute();
    }
    console.log(`[LiveKit] Microphone ${muted ? 'muted' : 'unmuted'}`);
}

/**
 * Disconnect from LiveKit room
 */
export async function disconnectFromLiveKitRoom(): Promise<void> {
    if (!currentRoom) {
        return;
    }

    try {
        await currentRoom.disconnect();
        console.log('[LiveKit] Disconnected from room');
    } catch (error) {
        console.error('[LiveKit] Error disconnecting:', error);
    } finally {
        cleanup();
    }
}

/**
 * Get current room instance
 */
export function getCurrentRoom(): Room | null {
    return currentRoom;
}

/**
 * Cleanup resources
 */
function cleanup() {
    if (localAudioTrack) {
        localAudioTrack.stop();
        localAudioTrack = null;
    }
    currentRoom = null;
}
