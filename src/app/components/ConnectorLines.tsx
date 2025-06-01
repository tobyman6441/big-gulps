import React from "react";

interface AnchorPoint {
  id: string;
  x: number;
  y: number;
  type: 'source' | 'target';
  cardId: string;
}

interface Connector {
  id: string;
  sourceAnchor: AnchorPoint;
  targetAnchor: AnchorPoint;
  path: string; // SVG path data
}

interface ConnectorLinesProps {
  connectors: Connector[];
  boardRect: { x: number; y: number; width: number; height: number };
  debug?: boolean;
}

const ConnectorLines: React.FC<ConnectorLinesProps> = ({ connectors, boardRect, debug }) => {
  const width = boardRect.width;
  const height = boardRect.height;

  return (
    <svg
      className="absolute pointer-events-none z-0"
      style={{ left: 0, top: 0, width: width, height: height, position: 'absolute' }}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
    >
      {connectors.map(connector => (
        <g key={connector.id}>
          <path
            d={connector.path}
            stroke="#4F46E5"
            strokeWidth={2}
            fill="none"
          />
          {debug && (
            <>
              <circle
                cx={connector.sourceAnchor.x}
                cy={connector.sourceAnchor.y}
                r={5}
                fill="red"
                opacity={0.7}
              />
              <circle
                cx={connector.targetAnchor.x}
                cy={connector.targetAnchor.y}
                r={5}
                fill="green"
                opacity={0.7}
              />
            </>
          )}
        </g>
      ))}
    </svg>
  );
};

export default ConnectorLines; 