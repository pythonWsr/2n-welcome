import * as T from 'three';

// Reviewed feature faces of the existing display GLBs. A bounding box can
// identify a thin axis, but cannot distinguish the detailed face from its back.
const profiles={
 rose:{front:[0,-1,0],up:[0,0,1]},
 clover:{front:[0,1,0],up:[0,0,-1]},
 goldenleaf:{front:[0,0,-1],up:[0,1,0]},
 cactus:{front:[0,0,-1],up:[0,1,0]},
 sand:{front:[0,0,-1],up:[0,1,0]},
 iris:{front:[0,0,-1],up:[0,1,0]},
 pearl:{front:[0,0,-1],up:[0,1,0]},
 shell:{front:[0,0,-1],up:[0,1,0]},
 starfish:{front:[0,0,1],up:[0,1,0]},
 peas:{front:[0,0,1],up:[0,1,0]},
 tomato:{front:[0,0,1],up:[0,1,0],pitch:.16},
 compass:{front:[0,0,-1],up:[0,1,0]},
 darkmark:{front:[0,0,-1],up:[0,1,0]},
 corruption:{front:[0,0,-1],up:[0,1,0]},
};
export function petalFrontQuaternion(name,dimensions){
 const profile=profiles[name];
 if(!profile){
  const normal=dimensions.y<Math.min(dimensions.x,dimensions.z)?new T.Vector3(0,1,0):dimensions.x<dimensions.z?new T.Vector3(1,0,0):new T.Vector3(0,0,1);
  return new T.Quaternion().setFromUnitVectors(normal,new T.Vector3(0,0,1));
 }
 const front=new T.Vector3(...profile.front),up=new T.Vector3(...profile.up),right=new T.Vector3().crossVectors(up,front);
 const face=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(right,up,front)).invert();
 // A small look down onto the tomato reveals the leaf crown as well as its body.
 return new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),profile.pitch||0).multiply(face);
}
