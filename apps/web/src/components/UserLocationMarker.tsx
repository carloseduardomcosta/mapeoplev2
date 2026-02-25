'use client';

/**
 * UserLocationMarker
 *
 * Renders a user's Google profile photo as a circular marker on the map.
 * Uses OverlayView to render React/HTML directly on the Google Maps canvas,
 * bypassing the SVG/icon limitations of the standard Marker component.
 *
 * Visual design:
 * - Circular photo with green border (online indicator)
 * - Name tooltip on hover
 * - Pulsing green ring animation
 * - Falls back to initials avatar if no photo available
 */

import { OverlayView } from '@react-google-maps/api';
import { UserLocation } from '@/lib/useLocationSharing';

interface UserLocationMarkerProps {
  location: UserLocation;
  isMe?: boolean;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

export default function UserLocationMarker({ location, isMe = false }: UserLocationMarkerProps) {
  const position = { lat: location.lat, lng: location.lng };

  return (
    <OverlayView
      position={position}
      mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
      getPixelPositionOffset={(width, height) => ({
        x: -(width / 2),
        y: -(height / 2),
      })}
    >
      <div
        className="relative flex flex-col items-center"
        style={{ width: 48, height: 56 }}
        title={`${location.name}${isMe ? ' (você)' : ' — ao vivo'}`}
      >
        {/* Pulsing ring */}
        <span
          className="absolute rounded-full animate-ping"
          style={{
            width: 48,
            height: 48,
            backgroundColor: isMe ? 'rgba(59, 130, 246, 0.35)' : 'rgba(34, 197, 94, 0.35)',
            top: 0,
            left: 0,
          }}
        />

        {/* Photo or initials avatar */}
        <div
          className="relative rounded-full overflow-hidden flex items-center justify-center text-white font-bold text-sm shadow-lg"
          style={{
            width: 44,
            height: 44,
            border: `3px solid ${isMe ? '#3B82F6' : '#22C55E'}`,
            backgroundColor: isMe ? '#1D4ED8' : '#15803D',
            flexShrink: 0,
          }}
        >
          {location.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={location.image}
              alt={location.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => {
                // Fallback to initials if image fails to load
                const target = e.currentTarget;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  parent.textContent = getInitials(location.name);
                }
              }}
            />
          ) : (
            <span style={{ fontSize: 14, fontWeight: 700 }}>
              {getInitials(location.name)}
            </span>
          )}
        </div>

        {/* Name label below the avatar */}
        <div
          className="mt-0.5 px-1.5 py-0.5 rounded text-white text-xs font-medium whitespace-nowrap shadow"
          style={{
            backgroundColor: isMe ? 'rgba(29, 78, 216, 0.85)' : 'rgba(21, 128, 61, 0.85)',
            backdropFilter: 'blur(4px)',
            maxWidth: 120,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            fontSize: 10,
          }}
        >
          {isMe ? 'Você' : location.name.split(' ')[0]}
        </div>
      </div>
    </OverlayView>
  );
}
