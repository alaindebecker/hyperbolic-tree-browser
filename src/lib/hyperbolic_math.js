/* [DEPRECATED] */
import math from 'mathjs';

console.error('this implementation is deprecated, use hypertree instead');

math.complex.one = math.complex(1, 0); // Add constant complex one to mathjs.

/**
 * Initial wedge.
 **/
const rootWedge = {
  p:     math.complex(0, 0),
  m:     math.complex(0, 1),
  alpha: Math.PI
};

/**
 * Complex function of z representing the processing of a circle preserving
 * transformation of the unit disk.
 *
 * P and theta are complex numbers, where |P| < 1 and |theta| = 1.
 *
 * This transformation indicates a rotation by theta around the origin,
 * followed by moving the origin to P (and -P to the origin).
 *
 *              theta * z + P
 * z^t = -----------------------------
 *       1 + conjungate(P) * theta * z
 *
 * Params:
 *  z     ... current (complex).
 *  p     ... perspective value, moving the origin to P (or -P to the origin).
 *  theta ... rotation around the origin.
 **/
const transform = (z, p, theta) => {
  return math.divide(
    math.add(math.multiply(theta, z), p),
    math.add(math.complex.one, math.multiply(p.conjugate(), theta, z))
  );
};

/**
 * Inverse transformation.
 **/
const inverseTransform = (p, theta) => {
  return [math.multiply(theta.conjugate(), p).neg(), theta.conjugate()];
};

/**
 * Calculate distance of children in subwedge.
 *
 * The parameter alpha is the angle between midline and edge of the subwedge,
 * where s is the desired distance between a child and the edge of its
 * subwedge. The distance typically uses a value of 0.12, 0.06, 0.23 or 0.28.
 *
 * Both, s and d are represented as the hyperbolic tangent of the distance in
 * the hyperbolic plane.  This form facilitates later operations in the
 * Poincare map, because it has the convenient property, that a line segment
 * on the unit disk with one end on the origin and extending the given amount
 * represents a segment extending the represented distance in the hyperbolic
 * plane.
 *
 * d = sqrt(((1 - s^2) * sin(alpha) / 2s)^2 + 1) - ((1 - s^2) * sin(alpha) / 2s)
 *
 * Returns a minimum of s;
 **/
const subwedgeDistance = (s, alpha) => {
  const interim = (1 - s*s) * Math.sin(alpha) / (2 * s);
  return Math.max(s, Math.sqrt(interim * interim + 1) - interim);
};

/**
 * Conversion from angle to complex number.
 **/
const angleToComplex = alpha => math.complex(Math.cos(alpha), Math.sin(alpha));

/**
 *
 * Given the subwedge for a child and the distance D to the child, the next
 * step is to calculate a wedge inside the subwedge, with its vertex at the
 * child, (to use for the recursive call)
 *
 * Given the vertex P, midline endpoint M angle A of the subwedge the
 * corresponding parameters of the contained wedge, that results from moving D
 * into the SUBWEDGE can be calculated using the transformation apparatus:
 *
 * p' = trans(d * m, <p,1>))
 * m' = trans(trans(m, <p,1>), <-p',1>)
 * a' = im(log(trans(e^ia, <-d,1>)))
 *
 * The im(log(..)) in the formula of a' returns the angle corresponding to the
 * complex number, doing the inverse of the conversion from ANGLE to COMPLEX
 * NUMBER, done by the e^ia These functions can be implemented using cos, sin
 * and arc tangent and a complex number constructors and selector instead.
 **/
const calculateWedge = node => {
  const s = 0.28;
  const wedge = node.parent ? node.parent.wedge : rootWedge;

  if (!node.children) {
    return wedge;
  }

  const p     = wedge.p;
  const m     = wedge.m;
  const theta = math.complex.one;

  const alpha = wedge.alpha / node.children.length;

  const distance = subwedgeDistance(s, alpha);

  let subwedge = {}

  subwedge.p = transform(math.multiply(m, distance), p, theta);
  subwedge.m = transform(transform(m, p, theta), subwedge.p.neg(), theta);

  const neg_d    = math.complex(-distance, 0);
  subwedge.alpha = transform(angleToComplex(alpha), neg_d, theta).log().im;

  return subwedge;
};

const childIndexByWedge = children => {
  return children.reduce((acc, n) => acc + (n.wedge ? 0 : 1), 0);
};

/**
 * Root node is always centered at 0, 0
 **/
const handleRootNode = node => {
  node.x = 0;
  node.y = 0;
};

/**
 * Layout of first generation nodes.
 *
 * Pj = [R * cos(Oj + oj/2), R * sin(Oj + oj/2)]
 *
 * From the centering root node the root children are circle centered in radius
 * R, separated by distance alpha of root node and half of own alpha (child
 * distance).
 **/
const handleRootChild = node => {
  //node.x = 0; node.y = node.z.im * 2; return ; // No rotation(!)

  const childIndex = childIndexByWedge(node.parent.children);

  node.omega = node.parent.wedge.alpha * childIndex;
  node.alpha = node.omega + node.wedge.alpha / 2;

  node.x = node.z.im * (Math.cos(node.alpha) * Math.PI / 2);
  node.y = node.z.im * (Math.sin(node.alpha) * Math.PI / 2);
};

/**
 * For all children of root children we proceed with similar manner, but share
 * the angle inbetween the subwedges.
 **/
const handleChild = node => {
  //node.x = 0; node.y = node.z.im * 2; return ; // No rotation(!)

  const childIndex = childIndexByWedge(node.parent.children);

  node.omega = node.parent.omega; // - node.parent.alpha;
  node.alpha = node.omega + node.parent.wedge.alpha * childIndex
    - (node.parent.alpha * 2);

  return node.alpha = node.parent.alpha; // use straight line for now...

  node.x = node.z.im * (Math.cos(node.alpha) * Math.PI / 2);
  node.y = node.z.im * (Math.sin(node.alpha) * Math.PI / 2);
};

/**
 * Hyperbolic Geometry
 *
 * Implements ... TODO
 *
 * Usage:
 *   import hyperbolic from 'hyperbolicjs';
 *
 *   hyperbolic.hyperbolicPoint({ x, y, parent, children });
 *   hyperbolic.transform(z, theta, p);
 *   hyperbolic.inverseTransform(z, theta, p);
 *
 * @see The Hyperbolic Browser: A Focus + Context Technique for Visualizing
 *   Large Hierarchies, Lamping and Rao 1996
 **/
export default {
  transform:        transform,
  inverseTransform: inverseTransform,

  /**
   * Using this method has to be performed hierarchically from root to leaves
   * in order to access parent results at the current node, allowing
   * calculations of wedges and subwedges.
   **/
  hyperbolicPoint: node => {
    console.groupCollapsed('** hyperbolicPoint %s (%i) **',
                           node.data.name, node.depth);

    node.wedge = calculateWedge(node);
    node.z     = node.parent ? node.parent.wedge.p : rootWedge.p;

    // return root node
    if (node.depth === 0) {
      handleRootNode(node);
    }

    if (node.depth === 1) {
      handleRootChild(node);
    }

    if (node.depth > 1) {
      handleChild(node);
    }

    console.debug('  z', node.z);
    console.debug('  parent/alpha %s/%s', node.wedge.alpha, node.alpha);
    console.debug('  x, y %s, %s', node.x, node.y);
    console.debug(node);

    console.groupEnd();
    return [node.x, node.y];
  }
};
