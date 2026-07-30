/**
 * TravelTimeViz - Geographic Travel Time Visualization Component
 * Version: 2.0.0
 *
 * A JavaScript library for visualizing travel times between locations using:
 * - Interactive network graphs with geographic positioning
 * - Distance matrices with heat map coloring
 *
 * Requires: D3.js v7+
 * License: MIT
 */

class TravelTimeViz {
  /**
   * Create a new travel time visualization
   * @param {Object} locationData - Object mapping location names to {lat, lng, color?, name?}
   * @param {Array} travelData - Array of {from, to, time, minutes} route objects
   * @param {Object} config - Optional configuration object
   */
  constructor(locationData, travelData, config = {}) {
    this.locationData = locationData;
    this.travelData = this.bidirectionalizeData(travelData);
    this.config = this.mergeConfig(config);
    this.locations = this.sortLocations();
    this.eventListeners = {};

    // Calculate color scale for matrix
    const maxTime = Math.max(...this.travelData.map(d => d.minutes));
    this.colorScale = d3.scaleSequential(d3[`interpolate${this.config.matrix.colorScheme}`])
      .domain([0, maxTime]);
  }

  /**
   * Make travel data bidirectional (if a→b exists, ensure b→a exists)
   * @private
   */
  bidirectionalizeData(data) {
    const bidirectional = [...data];
    const seen = new Set();

    data.forEach(route => {
      const key = `${route.from}-${route.to}`;
      const reverseKey = `${route.to}-${route.from}`;
      seen.add(key);

      if (!seen.has(reverseKey)) {
        bidirectional.push({
          from: route.to,
          to: route.from,
          time: route.time,
          minutes: route.minutes
        });
        seen.add(reverseKey);
      }
    });

    return bidirectional;
  }

  /**
   * Merge user configuration with defaults
   * @private
   */
  mergeConfig(userConfig) {
    const defaults = {
      network: {
        width: null,
        height: 550,
        nodeRadius: 22,
        enableZoom: true,
        enableDrag: true,
        linkStrength: 0.15,
        chargeStrength: -400,
        showArrows: true,
        geographicPositioning: true
      },
      matrix: {
        width: null,
        height: 550,
        colorScheme: 'YlOrRd'
      },
      sortOrder: 'north-south',
      customOrder: [],
      defaultColors: [
        '#e74c3c', '#3498db', '#2ecc71', '#9b59b6',
        '#f39c12', '#1abc9c', '#e67e22', '#34495e'
      ]
    };

    return {
      network: { ...defaults.network, ...userConfig.network },
      matrix: { ...defaults.matrix, ...userConfig.matrix },
      sortOrder: userConfig.sortOrder || defaults.sortOrder,
      customOrder: userConfig.customOrder || defaults.customOrder,
      defaultColors: userConfig.defaultColors || defaults.defaultColors
    };
  }

  /**
   * Sort locations north to south by latitude
   * @private
   */
  sortLocations() {
    const unique = [...new Set([
      ...this.travelData.map(d => d.from),
      ...this.travelData.map(d => d.to)
    ])];

    if (this.config.sortOrder === 'custom' && this.config.customOrder.length > 0) {
      return this.config.customOrder.filter(loc => unique.includes(loc));
    }

    return unique.sort((a, b) => {
      const latA = this.locationData[a]?.lat || 0;
      const latB = this.locationData[b]?.lat || 0;
      return latB - latA;
    });
  }

  /**
   * Get color for a location
   * @private
   */
  getLocationColor(location) {
    if (this.locationData[location]?.color) {
      return this.locationData[location].color;
    }
    const index = this.locations.indexOf(location);
    return this.config.defaultColors[index % this.config.defaultColors.length];
  }

  /**
   * Render both network graph and distance matrix
   * @param {string} networkContainer - CSS selector for network container
   * @param {string} matrixContainer - CSS selector for matrix container
   */
  render(networkContainer, matrixContainer) {
    if (networkContainer) this.renderNetwork(networkContainer);
    if (matrixContainer) this.renderMatrix(matrixContainer);
  }

  /**
   * Render the network graph visualization
   * @param {string} containerId - CSS selector for container element
   */
  renderNetwork(containerId) {
    const container = d3.select(containerId);
    container.selectAll('*').remove();

    const width = this.config.network.width || container.node().clientWidth;
    const height = this.config.network.height;

    const svg = container.append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('class', 'traveltimeviz-network');

    const g = svg.append('g');

    // Zoom behavior
    if (this.config.network.enableZoom) {
      const zoom = d3.zoom()
        .scaleExtent([0.5, 3])
        .on('zoom', (event) => {
          g.attr('transform', event.transform);
        });
      svg.call(zoom);
    }

    // Create nodes with geographic positioning
    const { nodes, minLng, maxLng } = this.createGeographicNodes(width, height);

    // Create links
    const links = this.travelData.map(d => ({
      source: d.from,
      target: d.to,
      time: d.time,
      minutes: d.minutes
    }));

    // Force simulation
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id)
        .distance(d => d.minutes * 0.4)
        .strength(this.config.network.linkStrength))
      .force('charge', d3.forceManyBody()
        .strength(this.config.network.chargeStrength))
      .force('y', d3.forceY(d => {
        const index = this.locations.indexOf(d.id);
        return (index + 1) * (height / (this.locations.length + 1));
      }).strength(2.0))
      .force('x', d3.forceX(d => {
        if (this.config.network.geographicPositioning && d.lng !== undefined) {
          const normalizedLng = (d.lng - minLng) / (maxLng - minLng);
          const padding = 0.15;
          return width * (padding + normalizedLng * (1 - 2 * padding));
        }
        return width / 2;
      }).strength(1.5))
      .force('collision', d3.forceCollide().radius(70));

    // Draw links
    const link = g.append('g')
      .selectAll('path')
      .data(links)
      .join('path')
      .attr('class', 'traveltimeviz-link')
      .attr('stroke', '#95a5a6')
      .attr('stroke-width', d => Math.sqrt(d.minutes) / 2)
      .attr('fill', 'none')
      .attr('opacity', 0.6)
      .attr('marker-end', this.config.network.showArrows ? 'url(#arrowhead)' : null)
      .on('mouseover', (event, d) => {
        d3.select(event.currentTarget)
          .attr('stroke', '#3498db')
          .attr('stroke-width', 3)
          .attr('opacity', 1);
        this.emit('linkHover', d);
      })
      .on('mouseout', (event, d) => {
        d3.select(event.currentTarget)
          .attr('stroke', '#95a5a6')
          .attr('stroke-width', Math.sqrt(d.minutes) / 2)
          .attr('opacity', 0.6);
      });

    // Arrowhead marker
    if (this.config.network.showArrows) {
      svg.append('defs').append('marker')
        .attr('id', 'arrowhead')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 25)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', '#95a5a6');
    }

    // Link labels
    const linkLabel = g.append('g')
      .selectAll('text')
      .data(links)
      .join('text')
      .attr('class', 'traveltimeviz-link-label')
      .attr('font-size', '12px')
      .attr('fill', '#7f8c8d')
      .attr('text-anchor', 'middle')
      .attr('font-weight', '600')
      .text(d => d.time);

    // Draw nodes
    const node = g.append('g')
      .selectAll('circle')
      .data(nodes)
      .join('circle')
      .attr('class', 'traveltimeviz-node')
      .attr('r', this.config.network.nodeRadius)
      .attr('fill', d => this.getLocationColor(d.id))
      .attr('cursor', 'pointer')
      .on('click', (event, d) => {
        this.emit('nodeClick', d);
      });

    // Drag behavior
    if (this.config.network.enableDrag) {
      node.call(d3.drag()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }));
    }

    // Node labels
    const nodeLabel = g.append('g')
      .selectAll('text')
      .data(nodes)
      .join('text')
      .attr('class', 'traveltimeviz-node-label')
      .attr('font-size', '14px')
      .attr('font-weight', '600')
      .attr('text-anchor', 'middle')
      .attr('dy', 38)
      .text(d => d.label);

    // Update on tick
    simulation.on('tick', () => {
      link.attr('d', d => {
        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        const dr = Math.sqrt(dx * dx + dy * dy);
        return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
      });

      linkLabel
        .attr('x', d => (d.source.x + d.target.x) / 2)
        .attr('y', d => (d.source.y + d.target.y) / 2);

      node
        .attr('cx', d => d.x)
        .attr('cy', d => d.y);

      nodeLabel
        .attr('x', d => d.x)
        .attr('y', d => d.y);
    });

    // Store for reset
    this._simulation = simulation;
    this._nodes = nodes;
  }

  /**
   * Create nodes with geographic positioning
   * @private
   */
  createGeographicNodes(width, height) {
    const lngs = this.locations.map(loc => this.locationData[loc]?.lng || 0);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const nodes = this.locations.map((loc, i) => {
      const yPos = (i + 1) * (height / (this.locations.length + 1));

      let xPos;
      if (this.config.network.geographicPositioning && this.locationData[loc]?.lng) {
        const lng = this.locationData[loc].lng;
        const normalizedLng = (lng - minLng) / (maxLng - minLng);
        const padding = 0.15;
        xPos = width * (padding + normalizedLng * (1 - 2 * padding));
      } else {
        xPos = width / 2;
      }

      return {
        id: loc,
        label: loc,
        x: xPos,
        y: yPos,
        lng: this.locationData[loc]?.lng
      };
    });

    return { nodes, minLng, maxLng };
  }

  /**
   * Render the distance matrix visualization
   * @param {string} containerId - CSS selector for container element
   */
  renderMatrix(containerId) {
    const container = d3.select(containerId);
    container.selectAll('*').remove();

    const width = this.config.matrix.width || container.node().clientWidth;
    const height = this.config.matrix.height;

    const svg = container.append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('class', 'traveltimeviz-matrix');

    const margin = { top: 80, right: 40, bottom: 40, left: 100 };
    const cellSize = Math.min(
      (width - margin.left - margin.right) / this.locations.length,
      (height - margin.top - margin.bottom) / this.locations.length
    );

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create matrix data
    const matrix = [];
    this.locations.forEach((from, i) => {
      this.locations.forEach((to, j) => {
        let minutes = 0;
        let time = '-';

        if (from === to) {
          minutes = 0;
          time = '0m';
        } else {
          const route = this.travelData.find(d => d.from === from && d.to === to);
          if (route) {
            minutes = route.minutes;
            time = route.time;
          }
        }

        matrix.push({ from, to, minutes, time, x: j, y: i });
      });
    });

    // Draw cells
    g.selectAll('rect')
      .data(matrix)
      .join('rect')
      .attr('class', 'traveltimeviz-matrix-cell')
      .attr('x', d => d.x * cellSize)
      .attr('y', d => d.y * cellSize)
      .attr('width', cellSize)
      .attr('height', cellSize)
      .attr('fill', d => d.minutes === 0 ? '#ecf0f1' : this.colorScale(d.minutes))
      .attr('stroke', 'white')
      .attr('stroke-width', 2)
      .attr('cursor', 'pointer')
      .on('click', (event, d) => {
        this.emit('cellClick', d);
      })
      .on('mouseover', (event) => {
        d3.select(event.currentTarget)
          .attr('stroke', '#3498db')
          .attr('stroke-width', 3);
      })
      .on('mouseout', (event) => {
        d3.select(event.currentTarget)
          .attr('stroke', 'white')
          .attr('stroke-width', 2);
      })
      .append('title')
      .text(d => `${d.from} → ${d.to}: ${d.time}`);

    // Cell text
    g.selectAll('.cell-text')
      .data(matrix.filter(d => d.minutes > 0))
      .join('text')
      .attr('class', 'traveltimeviz-matrix-text')
      .attr('x', d => d.x * cellSize + cellSize / 2)
      .attr('y', d => d.y * cellSize + cellSize / 2 + 5)
      .attr('font-size', '12px')
      .attr('fill', 'white')
      .attr('text-anchor', 'middle')
      .attr('font-weight', '600')
      .attr('pointer-events', 'none')
      .text(d => d.time);

    // Row labels
    g.selectAll('.row-label')
      .data(this.locations)
      .join('text')
      .attr('class', 'traveltimeviz-matrix-label')
      .attr('x', -10)
      .attr('y', (d, i) => i * cellSize + cellSize / 2 + 5)
      .attr('font-size', '13px')
      .attr('fill', '#2c3e50')
      .attr('font-weight', '600')
      .attr('text-anchor', 'end')
      .text(d => d);

    // Column labels
    g.selectAll('.col-label')
      .data(this.locations)
      .join('text')
      .attr('class', 'traveltimeviz-matrix-label')
      .attr('x', (d, i) => i * cellSize + cellSize / 2)
      .attr('y', -10)
      .attr('font-size', '13px')
      .attr('fill', '#2c3e50')
      .attr('font-weight', '600')
      .attr('text-anchor', 'middle')
      .text(d => d);
  }

  /**
   * Update data and re-render
   */
  updateData(locationData, travelData) {
    this.locationData = locationData;
    this.travelData = this.bidirectionalizeData(travelData);
    this.locations = this.sortLocations();

    const maxTime = Math.max(...this.travelData.map(d => d.minutes));
    this.colorScale = d3.scaleSequential(d3[`interpolate${this.config.matrix.colorScheme}`])
      .domain([0, maxTime]);
  }

  /**
   * Reset network graph node positions
   */
  resetNetwork() {
    if (this._simulation && this._nodes) {
      this._nodes.forEach(node => {
        node.fx = null;
        node.fy = null;
      });
      this._simulation.alpha(1).restart();
    }
  }

  /**
   * Register event listener
   */
  on(eventName, callback) {
    if (!this.eventListeners[eventName]) {
      this.eventListeners[eventName] = [];
    }
    this.eventListeners[eventName].push(callback);
  }

  /**
   * Emit event to listeners
   * @private
   */
  emit(eventName, data) {
    if (this.eventListeners[eventName]) {
      this.eventListeners[eventName].forEach(callback => {
        callback({ detail: data });
      });
    }
  }

  /**
   * Clean up and remove visualizations
   */
  destroy() {
    if (this._simulation) {
      this._simulation.stop();
    }
    this.eventListeners = {};
  }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TravelTimeViz;
}
if (typeof window !== 'undefined') {
  window.TravelTimeViz = TravelTimeViz;
}
