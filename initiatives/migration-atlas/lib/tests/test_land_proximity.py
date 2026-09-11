"""Independent geometric checks for the editorial distance audit."""
import math
import random
import sys
from pathlib import Path
import unittest
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
from audit_land_proximity import angle, nearest_on_segment, nearest_boundary, segments, vector, RADIUS_KM


class LandProximityTests(unittest.TestCase):
    def distance(self, p, a, b):
        return nearest_on_segment(vector(p), vector(a), vector(b))[0]

    def test_interior_perpendicular_not_nearest_vertex(self):
        self.assertAlmostEqual(self.distance([5, 1], [0, 0], [10, 0]), math.radians(1), places=12)
        self.assertAlmostEqual(self.distance([5, 0], [0, 0], [10, 0]), 0, places=12)

    def test_endpoint_when_perpendicular_falls_beyond_arc(self):
        self.assertAlmostEqual(self.distance([20, 0], [0, 0], [10, 0]), math.radians(10), places=12)
        self.assertAlmostEqual(self.distance([180, 0], [0, 0], [10, 0]), math.radians(170), places=12)

    def test_dateline_and_pole(self):
        self.assertAlmostEqual(self.distance([180, 1], [170, 0], [-170, 0]), math.radians(1), places=12)
        self.assertAlmostEqual(self.distance([0, 90], [0, 80], [180, 80]), 0, places=12)
        self.assertAlmostEqual(self.distance([0, 90], [0, 0], [30, 0]), math.pi/2, places=12)

    def test_repeated_vertex_and_antipodal_failure(self):
        self.assertAlmostEqual(self.distance([0, 1], [0, 0], [0, 0]), math.radians(1), places=12)
        with self.assertRaisesRegex(ValueError, 'Antipodal'):
            self.distance([10, 10], [0, 0], [180, 0])

    def test_nearest_ring_including_holes_and_closed_ring_validation(self):
        polygon = {'type': 'Polygon', 'coordinates': [[[0,0], [0,10], [10,10], [10,0], [0,0]], [[4,4], [6,4], [6,6], [4,6], [4,4]]]}
        edges = segments(polygon)
        distance, point = nearest_boundary([5, 5], edges)
        self.assertLess(distance, 112)
        self.assertGreater(distance, 110)
        self.assertTrue(4 <= point[0] <= 6 and 4 <= point[1] <= 6)
        with self.assertRaisesRegex(ValueError, 'closed'):
            segments({'type': 'Polygon', 'coordinates': [[[0,0], [0,10], [10,10], [10,0]]]})

    def test_threshold_uses_spherical_distance_in_km(self):
        for km in [299.99, 300, 300.01]:
            radians = self.distance([5, math.degrees(km/RADIUS_KM)], [0,0], [10,0])
            self.assertAlmostEqual(radians * RADIUS_KM, km, places=9)

    def test_analytic_minimum_against_independent_dense_slerp(self):
        rng = random.Random(20260911)
        for _ in range(60):
            p, a, b = [vector([rng.uniform(-180,180), rng.uniform(-85,85)]) for _ in range(3)]
            arc = angle(a,b)
            exact, closest = nearest_on_segment(p,a,b)
            count = 1000
            # Independent spherical interpolation samples; nearest sample must lie
            # within half a sample interval of a true minimum on this same arc.
            sampled = math.pi
            for i in range(count+1):
                t=i/count
                q=tuple((math.sin((1-t)*arc)*a[j] + math.sin(t*arc)*b[j])/math.sin(arc) for j in range(3))
                sampled=min(sampled, angle(p,q))
            self.assertLessEqual(exact, sampled + 1e-12)
            self.assertLessEqual(sampled-exact, arc/(2*count) + 1e-12)
            self.assertAlmostEqual(angle(a,closest)+angle(closest,b), arc, places=9)


if __name__ == '__main__':
    unittest.main()
