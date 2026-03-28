import React, { useEffect, useState, useRef } from 'react';
import { View, Image, Animated, Dimensions, TouchableWithoutFeedback} from 'react-native';

const SpriteSheet = ({ spriteSheetImage, frameWidth, frameHeight, animationSequence, frameNum, loop = true, style, isActive=false}) => {
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isActiveState, setIsActiveState] = useState(isActive);
  const animationRef = useRef(null);
  const segmentTimer = useRef(null);

  useEffect(() => {
    setIsActiveState(isActive);
  }, [isActive]);

  useEffect(() => {

    if (!isActiveState) {
      clearInterval(animationRef.current);
      clearTimeout(segmentTimer.current);
      return;
    }
    if (!loop && currentSegmentIndex > animationSequence.length - 1) {
      return;
    }

    const segment = animationSequence[currentSegmentIndex];
    let frameIndex = 0;

    if (segment.frameCount > 1) {
      animationRef.current = setInterval(() => {
        setCurrentFrame(segment.startFrame + frameIndex);
        frameIndex = (frameIndex + 1) % segment.frameCount;
      }, segment.duration / segment.frameCount);
    } else {
      setCurrentFrame(segment.startFrame); 
    }

    segmentTimer.current = setTimeout(() => {
      setCurrentSegmentIndex((prevIndex) => {
        const nextIndex = prevIndex + 1;
        if (nextIndex < animationSequence.length) return nextIndex;
        return loop ? 0 : prevIndex;
      });
    }, segment.duration);

    return () => {
      clearInterval(animationRef.current);
      clearTimeout(segmentTimer.current);
    };
  }, [currentSegmentIndex, animationSequence, loop, isActiveState]);

  const offsetX = -currentFrame * frameWidth;


  return (
      <View
        style={[
          {
            width: frameWidth,
            height: frameHeight,
            overflow: 'hidden',
          },
          style // Add the passed style prop here
        ]}
      >
        <View
          style={{
            flexDirection: 'row',
            transform: [{ translateX: offsetX }],
          }}
        >
          <Image
            source={spriteSheetImage}
            style={{
              width: frameWidth * frameNum, // total number of frames in sheet
              height: frameHeight,
            }}
          />
        </View>
      </View>
  );
};

const SegmentedLayeredSprite = ({ width, height, animationSequence, loop = true, children }) => {
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [frameIndex, setFrameIndex] = useState(0);
  const [currentFrame, setCurrentFrame] = useState(0);

  const intervalRef = useRef(null);
  const segmentTimerRef = useRef(null);

  useEffect(() => {
    const segment = animationSequence[currentSegmentIndex];
    let frame = 0;

    if (segment.frameCount > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentFrame(segment.startFrame + frame);
        frame = (frame + 1) % segment.frameCount;
      }, segment.duration / segment.frameCount);
    } else {
      setCurrentFrame(segment.startFrame);
    }

    segmentTimerRef.current = setTimeout(() => {
      setCurrentSegmentIndex(prev => {
        const next = prev + 1;
        return next < animationSequence.length
          ? next
          : loop ? 0 : prev;
      });
    }, segment.duration);

    return () => {
      clearInterval(intervalRef.current);
      clearTimeout(segmentTimerRef.current);
    };
  }, [currentSegmentIndex, animationSequence, loop]);

  return (
    <View style={{ width, height, position: 'relative' }}>
      {React.Children.map(children, child => 
        React.cloneElement(child, { currentFrame })
      )}
    </View>
  );
};

// Component for each individual sprite layer
const SpriteLayer = ({ 
  spriteSheetImage, 
  frameWidth, 
  frameHeight, 
  frameCount,
  currentFrame = 0,
  style = {} 
}) => {
  // Calculate the offset for the provided frame
  const offsetX = -currentFrame * frameWidth;

  return (
    <View
      style={{
        width: frameWidth,
        height: frameHeight,
        overflow: 'hidden',
        position: 'absolute',
        ...style
      }}
    >
      <View 
        style={{
          flexDirection: 'row',
          transform: [{ translateX: offsetX }]
        }}
      >
        <Image
          source={spriteSheetImage}
          style={{
            width: frameWidth * frameCount,
            height: frameHeight,
          }}
        />
      </View>
    </View>
  );
};

// Export all components
export { SpriteSheet, SegmentedLayeredSprite, SpriteLayer };
export default SpriteSheet;