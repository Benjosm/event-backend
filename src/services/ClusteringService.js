/**
 * ClusteringService.js
 * 
 * Service for clustering events based on geographic proximity.
 * Groups events that are within a specified radius of each other.
 */

/**
 * Calculates the distance between two coordinates in meters using the Haversine formula.
 * @param {Object} coord1 - First coordinate with latitude and longitude
 * @param {Object} coord2 - Second coordinate with latitude and longitude
 * @returns {number} Distance in meters
 */
function calculateDistance(coord1, coord2) {
  const R = 6371000; // Earth's radius in meters
  const lat1 = (coord1.latitude * Math.PI) / 180;
  const lat2 = (coord2.latitude * Math.PI) / 180;
  const deltaLat = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
  const deltaLon = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
}

/**
 * Union-Find (Disjoint Set) data structure for efficient clustering
 */
class UnionFind {
  constructor(size) {
    this.parent = Array(size).fill(0).map((_, i) => i);
    this.rank = Array(size).fill(0);
  }

  find(x) {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]); // Path compression
    }
    return this.parent[x];
  }

  union(x, y) {
    const rootX = this.find(x);
    const rootY = this.find(y);

    if (rootX === rootY) return;

    // Union by rank
    if (this.rank[rootX] < this.rank[rootY]) {
      this.parent[rootX] = rootY;
    } else if (this.rank[rootX] > this.rank[rootY]) {
      this.parent[rootY] = rootX;
    } else {
      this.parent[rootY] = rootX;
      this.rank[rootX]++;
    }
  }
}

/**
 * Validates if a coordinate is valid.
 * @param {Object} coord - The coordinate object
 * @returns {boolean} True if coordinate is valid
 */
function isValidCoordinate(coord) {
  if (!coord || typeof coord.latitude !== 'number' || typeof coord.longitude !== 'number') {
    return false;
  }
  // Check if latitude is between -90 and 90, and longitude between -180 and 180
  return coord.latitude >= -90 && coord.latitude <= 90 && coord.longitude >= -180 && coord.longitude <= 180;
}

/**
 * Creates a grid index for spatial partitioning.
 * Each cell is the size of the radius (in meters), so events within radius distance
 * will be in the same or adjacent cells.
 * 
 * @param {Array} events - Array of valid events with coordinates
 * @param {number} radiusInMeters - Clustering radius in meters
 * @returns {Object} Grid index mapping (row, col) => event indices
 */
function createGridIndex(events, radiusInMeters) {
  const earthCircumference = 40075000; // meters
  const degPerMeter = 360 / earthCircumference;
  const degreesPerCell = radiusInMeters * degPerMeter;

  const grid = new Map();

  events.forEach((event, index) => {
    const lat = event.coordinates.latitude;
    const lon = event.coordinates.longitude;

    const row = Math.floor(lat / degreesPerCell);
    const col = Math.floor(lon / degreesPerCell);
    const key = `${row},${col}`;

    if (!grid.has(key)) {
      grid.set(key, []);
    }
    grid.get(key).push(index);
  });

  return { grid, degreesPerCell };
}

/**
 * Gets all event indices from a cell and its 8 neighboring cells.
 * @param {Map} grid - Grid index
 * @param {number} row 
 * @param {number} col 
 * @returns {Array} List of event indices
 */
function getNearbyIndices(grid, row, col) {
  const indices = [];
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      const key = `${row + i},${col + j}`;
      if (grid.has(key)) {
        indices.push(...grid.get(key));
      }
    }
  }
  return indices;
}

/**
 * Clusters events based on geographic proximity.
 * 
 * @param {Array} events - Array of event objects with coordinates property
 * @param {number} radiusInMeters - Maximum distance (in meters) for events to be in the same cluster
 * @returns {Array} - Array of **new** event objects with added `clusterId` property.
 *                   Original event instances are **not mutated**.
 * 
 * @example
 * const events = [{ id: 1, coordinates: { latitude: 40.7128, longitude: -74.0060 } }];
 * const clustered = clusterEvents(events, 1000);
 * console.log(clustered[0].clusterId); // 'cluster_123abc'
 * 
 * @throws {Error} If `events` is not an array or `radiusInMeters` is not a positive number
 * 
 * @note The `clusterId` assignment is **in-memory only**.
 *       To persist cluster assignments, use your data store:
 *       e.g., await eventRepository.update({ id: event.id }, { clusterId: event.clusterId });
 */
function clusterEvents(events, radiusInMeters) {
  // Input validation
  if (!Array.isArray(events)) {
    throw new Error('Events must be an array');
  }

  if (typeof radiusInMeters !== 'number' || radiusInMeters <= 0) {
    throw new Error('Radius must be a positive number');
  }

  if (events.length === 0) {
    return [];
  }

  // Filter valid events and log warnings for skipped ones
  const validEvents = [];
  for (const event of events) {
    if (!event.coordinates || !isValidCoordinate(event.coordinates)) {
      const eventId = event.id ? ` (ID: ${event.id})` : '';
      console.warn(`Skipping event with invalid coordinates${eventId}`);
      continue;
    }
    validEvents.push(event);
  }

  if (validEvents.length === 0) {
    return [];
  }

  // Use validEvents for clustering
  const n = validEvents.length;
  const unionFind = new UnionFind(n);

  // Create spatial grid index
  const { grid, degreesPerCell } = createGridIndex(validEvents, radiusInMeters);

  // For each event, compare only with events in nearby grid cells
  for (let i = 0; i < n; i++) {
    const lat = validEvents[i].coordinates.latitude;
    const lon = validEvents[i].coordinates.longitude;

    const row = Math.floor(lat / degreesPerCell);
    const col = Math.floor(lon / degreesPerCell);

    const nearbyIndices = getNearbyIndices(grid, row, col);

    for (const j of nearbyIndices) {
      if (i < j) { // Avoid duplicate comparisons
        const distance = calculateDistance(validEvents[i].coordinates, validEvents[j].coordinates);
        if (distance <= radiusInMeters) {
          unionFind.union(i, j);
        }
      }
    }
  }

  // Group events by cluster root and assign cluster IDs
  const rootToClusterId = new Map();
  const clusteredEvents = validEvents.map((event, index) => {
    const root = unionFind.find(index);
    
    if (!rootToClusterId.has(root)) {
      rootToClusterId.set(root, generateClusterId());
    }

    return {
      ...event,
      clusterId: rootToClusterId.get(root)
    };
  });

  return clusteredEvents;
}

/**
 * Generates a simple cluster ID.
 * In a production environment, this could be a UUID.
 * 
 * @returns {string} A unique cluster ID
 */
function generateClusterId() {
  return `cluster_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

module.exports = {
  clusterEvents,
  calculateDistance,
  generateClusterId
};
