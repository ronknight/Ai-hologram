import { MeshStandardMaterial, Group, PointLight, PerspectiveCamera, OrbitControls } from 'three';
import { ReactThreeFiber } from '@react-three/fiber'

declare global {
  namespace JSX {
    interface IntrinsicElements {
      group: ReactThreeFiber.Object3DNode<Group, typeof Group>;
      primitive: ReactThreeFiber.Object3DNode<any, any>;
      meshStandardMaterial: ReactThreeFiber.MaterialNode<MeshStandardMaterial, typeof MeshStandardMaterial>;
      pointLight: ReactThreeFiber.Object3DNode<PointLight, typeof PointLight>;
      perspectiveCamera: ReactThreeFiber.Object3DNode<PerspectiveCamera, typeof PerspectiveCamera>;
      orbitControls: ReactThreeFiber.Node<OrbitControls, typeof OrbitControls>;
    }
  }
}