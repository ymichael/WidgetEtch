const { widget } = figma;
const {
  AutoLayout,
  SVG,
  Frame,
  Rectangle,
  Ellipse,
  Text,
  useSyncedState,
  useSyncedMap,
  usePropertyMenu,
} = widget;

const FRAME_WIDTH = 400;
const FRAME_PADDING = 37;
const CANVAS_WIDTH = 400 - 2 * FRAME_PADDING;
const CANVAS_HEIGHT = 200;
const CONTROL_SIZE = 42;
const CONTROL_GAP = 4;
const MOVE_UNIT = 5;
const INITIAL_MOVES: TMove[] = [
  { type: "v", size: 5 },
  { type: "h", size: 5 },
];
const HELLO_MOVES: TMove[] = [
  { type: "h", size: -5 },
  { type: "v", size: 40 },
  { type: "h", size: 20 },
  { type: "v", size: 100 },
  { type: "v", size: -50 },
  { type: "h", size: 50 },
  { type: "v", size: 50 },
  { type: "v", size: -100 },
  { type: "v", size: 100 },
  { type: "h", size: 20 },
  { type: "h", size: 60 },
  { type: "h", size: -50 },
  { type: "v", size: -60 },
  { type: "h", size: 50 },
  { type: "v", size: 30 },
  { type: "h", size: -50 },
  { type: "v", size: 30 },
  { type: "h", size: 50 },
  { type: "v", size: -10 },
  { type: "v", size: 10 },
  { type: "h", size: 40 },
  { type: "v", size: -100 },
  { type: "v", size: 100 },
  { type: "h", size: 50 },
  { type: "v", size: -100 },
  { type: "v", size: 100 },
  { type: "h", size: 80 },
  { type: "v", size: -50 },
  { type: "h", size: -50 },
  { type: "v", size: 50 },
];
const POSITION_MARKER: TMove[] = [
  { type: "v", size: 2 },
  { type: "h", size: 2 },
  { type: "v", size: -4 },
  { type: "h", size: -4 },
  { type: "v", size: 4 },
  { type: "h", size: 4 },
];

interface SyncedOrderedQueue<T> {
  readonly length: number;
  push(val: T): void;
  reset(vals: T[]): void;
  values(): T[];
}

class SyncedOrderedQueueImpl<T> implements SyncedOrderedQueue<T> {
  private readonly valuesMap: SyncedMap<T>;
  private nextKeyStart: number;
  private readonly setNextKeyStart: (v: number) => void;

  constructor(
    valuesMap: SyncedMap<T>,
    nextKeyStart: number,
    setNextKeyStart: (v: number) => void
  ) {
    this.valuesMap = valuesMap;
    this.nextKeyStart = nextKeyStart;
    this.setNextKeyStart = setNextKeyStart;
  }

  private getKeyBetween = (from: number, to: number): number => {
    return from + Math.random() * (from - to);
  };

  private getNextKey(): string {
    const retVal = this.getKeyBetween(this.nextKeyStart, this.nextKeyStart + 1);
    this.setNextKeyStart(this.nextKeyStart + 1);
    this.nextKeyStart += 1;
    return String(retVal);
  }

  get length() {
    return this.valuesMap.length;
  }

  push(value: T): void {
    this.valuesMap.set(this.getNextKey(), value);
  }

  reset(values: T[]): void {
    this.valuesMap.keys().forEach((k) => this.valuesMap.delete(k));
    values.forEach((v) => this.push(v));
  }

  values(): T[] {
    const entriesToSort: [number, T][] = this.valuesMap
      .entries()
      .map(([a, b]) => {
        return [Number(a), b];
      });
    entriesToSort.sort((a, b) => {
      return a[0] - b[0];
    });
    return entriesToSort.map(([_, b]) => b);
  }
}

function useSyncedQueue<T>(name: string): SyncedOrderedQueue<T> {
  const valuesMap = useSyncedMap<T>(`syncedQueue.${name}.values`);
  const [nextKeyStart, setNextKeyStart] = useSyncedState<number>(
    `syncedQueue.${name}.key`,
    0
  );
  return new SyncedOrderedQueueImpl(valuesMap, nextKeyStart, setNextKeyStart);
}

type TMove = {
  type: "v" | "h";
  size: number;
};

const movesToPath = (moves: TMove[]): string => {
  const pathParts = ["M 0,0"];

  let currentType;
  let currentSize;
  moves.forEach(({ type, size }) => {
    if (currentType === type && Math.sign(currentSize) === Math.sign(size)) {
      currentSize += size;
    } else {
      if (currentType && currentSize) {
        pathParts.push(`${currentType} ${currentSize}`);
      }
      currentType = type;
      currentSize = size;
    }
  });

  if (currentType && currentSize) {
    pathParts.push(`${currentType} ${currentSize}`);
  }

  return pathParts.join(" ");
};

const generateSvg = (moves: TMove[]): string => {
  return `
    <svg viewBox="0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <path fill="none" stroke="black" stroke-opacity="0.6" stroke-width="3px"
      d="${movesToPath(moves)}" />
  </svg>
  `;
};

function Widget() {
  const pathQueue = useSyncedQueue<TMove>("path");
  const onDraw = (dir: "left" | "right" | "up" | "down") => {
    switch (dir) {
      case "left":
        pathQueue.push({ type: "h", size: -MOVE_UNIT });
        break;
      case "right":
        pathQueue.push({ type: "h", size: MOVE_UNIT });
        break;
      case "up":
        pathQueue.push({ type: "v", size: -MOVE_UNIT });
        break;
      case "down":
        pathQueue.push({ type: "v", size: MOVE_UNIT });
        break;
    }
  };
  usePropertyMenu(
    [
      {
        itemType: "action",
        tooltip: "Draw Hello",
        propertyName: "hello",
      },
      {
        itemType: "action",
        tooltip: "Reset",
        propertyName: "reset",
      },
    ],
    ({ propertyName }) => {
      if (propertyName === "reset") {
        pathQueue.reset([]);
      } else if (propertyName === "hello") {
        pathQueue.reset(HELLO_MOVES);
      }
    }
  );

  return (
    <AutoLayout
      direction="vertical"
      width={FRAME_WIDTH}
      height={320}
      cornerRadius={20}
      fill={{
        type: "solid",
        visible: true,
        opacity: 1,
        blendMode: "normal",
        color: {
          r: 0.9019607901573181,
          g: 0.2235294133424759,
          b: 0.19607843458652496,
          a: 1,
        },
      }}
    >
      <AutoLayout
        width={FRAME_WIDTH}
        padding={10}
        horizontalAlignItems="center"
      >
        <Text
          fill={{
            type: "solid",
            visible: true,
            opacity: 1,
            blendMode: "normal",
            color: {
              r: 0.9019607901573181,
              g: 0.2235294133424759,
              b: 0.19607843458652496,
              a: 1,
            },
          }}
          effect={[
            {
              type: "inner-shadow",
              color: { r: 0, g: 0, b: 0, a: 0.28999999165534973 },
              offset: { x: 2, y: 2 },
              spread: 0,
              visible: true,
              blendMode: "normal",
              blur: 2,
            },
          ]}
          fontSize={18}
          fontFamily="Comic Sans MS"
          fontWeight="bold"
          letterSpacing="-5%"
        >
          Etch a Jam
        </Text>
      </AutoLayout>
      <AutoLayout
        padding={{ left: FRAME_PADDING, right: FRAME_PADDING }}
        height="hug-contents"
      >
        <Frame
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          fill={{
            type: "solid",
            visible: true,
            opacity: 1,
            blendMode: "normal",
            color: {
              r: 0.8784313797950745,
              g: 0.8784313797950745,
              b: 0.8784313797950745,
              a: 1,
            },
          }}
          cornerRadius={11}
          effect={[
            {
              type: "inner-shadow",
              color: {
                r: 0.6208333373069763,
                g: 0.5909988284111023,
                b: 0.5897916555404663,
                a: 1,
              },
              offset: { x: 1, y: 1 },
              spread: 1,
              visible: true,
              blendMode: "normal",
              blur: 2,
            },
          ]}
        >
          <SVG
            src={generateSvg([
              ...INITIAL_MOVES,
              ...pathQueue.values(),
              ...POSITION_MARKER,
            ])}
            width={"fill-parent"}
            height={"fill-parent"}
          />
        </Frame>
      </AutoLayout>
      <AutoLayout
        direction="horizontal"
        spacing={FRAME_WIDTH - 2 * (20 + CONTROL_SIZE)}
        width={FRAME_WIDTH}
        padding={20}
      >
        <AutoLayout direction="vertical" spacing={CONTROL_GAP} rotation={90}>
          <Frame
            onClick={onDraw.bind(null, "left")}
            width={CONTROL_SIZE}
            height={CONTROL_SIZE / 2}
            effect={[
              {
                type: "drop-shadow",
                color: {
                  r: 0.05416666716337204,
                  g: 0.0521354153752327,
                  b: 0.0521354153752327,
                  a: 0.6700000166893005,
                },
                offset: { x: 1, y: 1 },
                spread: 0,
                visible: true,
                blendMode: "normal",
                blur: 2,
              },
            ]}
          >
            <Ellipse
              height={CONTROL_SIZE}
              width={CONTROL_SIZE}
              fill={"#FFFFFF"}
            ></Ellipse>
          </Frame>
          <Frame
            onClick={onDraw.bind(null, "right")}
            width={CONTROL_SIZE}
            height={CONTROL_SIZE / 2}
            effect={[
              {
                type: "drop-shadow",
                color: {
                  r: 0.05416666716337204,
                  g: 0.0521354153752327,
                  b: 0.0521354153752327,
                  a: 0.6700000166893005,
                },
                offset: { x: 1, y: 1 },
                spread: 0,
                visible: true,
                blendMode: "normal",
                blur: 2,
              },
            ]}
          >
            <Ellipse
              y={-1 * (CONTROL_SIZE / 2)}
              width={CONTROL_SIZE}
              height={CONTROL_SIZE}
              fill={"#FFFFFF"}
            ></Ellipse>
          </Frame>
        </AutoLayout>
        <AutoLayout direction="vertical" spacing={CONTROL_GAP}>
          <Frame
            onClick={onDraw.bind(null, "up")}
            width={CONTROL_SIZE}
            height={CONTROL_SIZE / 2 - 2}
            effect={[
              {
                type: "drop-shadow",
                color: {
                  r: 0.05416666716337204,
                  g: 0.0521354153752327,
                  b: 0.0521354153752327,
                  a: 0.6700000166893005,
                },
                offset: { x: 1, y: 1 },
                spread: 0,
                visible: true,
                blendMode: "normal",
                blur: 2,
              },
            ]}
          >
            <Ellipse
              height={CONTROL_SIZE}
              width={CONTROL_SIZE}
              fill={"#FFFFFF"}
            ></Ellipse>
          </Frame>
          <Frame
            onClick={onDraw.bind(null, "down")}
            width={CONTROL_SIZE}
            height={CONTROL_SIZE / 2 - 2}
            effect={[
              {
                type: "drop-shadow",
                color: {
                  r: 0.05416666716337204,
                  g: 0.0521354153752327,
                  b: 0.0521354153752327,
                  a: 0.6700000166893005,
                },
                offset: { x: 1, y: 1 },
                spread: 0,
                visible: true,
                blendMode: "normal",
                blur: 2,
              },
            ]}
          >
            <Ellipse
              y={-1 * (CONTROL_SIZE / 2 + 2)}
              width={CONTROL_SIZE}
              height={CONTROL_SIZE}
              fill={"#FFFFFF"}
            ></Ellipse>
          </Frame>
        </AutoLayout>
      </AutoLayout>
      <AutoLayout></AutoLayout>
    </AutoLayout>
  );
}

widget.register(Widget);
