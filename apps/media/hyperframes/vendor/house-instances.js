const active = new WeakMap();
const noop = () => { };
// The loaded hierarchy stays static beneath its rotating root for this ownership period.
export function configureHouseInstances(options) {
    if (options?.model !== '/heroes/house.glb')
        return noop;
    const { THREE, scene } = options;
    if (!THREE?.Object3D || !(scene instanceof THREE.Object3D))
        throw new TypeError('Invalid House instance root.');
    const prior = active.get(scene);
    if (prior)
        return prior;
    scene.updateWorldMatrix(true, true);
    if (!scene.matrixWorld.elements.every(Number.isFinite) || scene.matrixWorld.determinant() === 0)
        throw new RangeError('Invalid House instance root transform.');
    const inverse = scene.matrixWorld.clone().invert(), groups = [];
    const visible = (node) => {
        for (let n = node; n; n = n.parent) {
            if (!n.visible)
                return false;
            if (n !== scene && n !== node && n.renderOrder !== 0)
                return false;
            if (n === scene)
                return true;
        }
        return false;
    };
    scene.traverse(candidate => {
        const node = candidate;
        if (node.constructor !== THREE.Mesh || !visible(node) || node.children.length || node.customDepthMaterial || node.customDistanceMaterial)
            return;
        for (const hook of ['onBeforeRender', 'onAfterRender', 'onBeforeShadow', 'onAfterShadow']) {
            if (node[hook] !== THREE.Object3D.prototype[hook])
                return;
        }
        const geometry = node.geometry;
        const material = node.material;
        if (!(geometry instanceof THREE.BufferGeometry) || geometry.isInstancedBufferGeometry ||
            Object.values(geometry.attributes).some(a => a.isInstancedBufferAttribute || a.data?.isInstancedInterleavedBuffer) ||
            Object.values(geometry.morphAttributes).some(a => !Array.isArray(a) || a.length))
            return;
        if (!(material instanceof THREE.MeshStandardMaterial) || !material.visible || material.transparent || material.opacity !== 1 ||
            (material.transmission ?? 0) !== 0 || material.stencilWrite || material.polygonOffset || !material.depthWrite || !material.depthTest ||
            material.blending !== THREE.NormalBlending || material.onBeforeCompile !== THREE.Material.prototype.onBeforeCompile)
            return;
        const matrix = new THREE.Matrix4().multiplyMatrices(inverse, node.matrixWorld);
        if (!matrix.elements.every(Number.isFinite) || matrix.determinant() <= 0)
            return;
        const position = new THREE.Vector3(), rotation = new THREE.Quaternion(), scale = new THREE.Vector3();
        matrix.decompose(position, rotation, scale);
        const composed = new THREE.Matrix4().compose(position, rotation, scale);
        if (![...position.toArray(), ...rotation.toArray(), ...scale.toArray()].every(Number.isFinite) || scale.toArray().some(v => v <= 0) ||
            matrix.elements.some((v, i) => Math.abs(v - composed.elements[i]) > 1e-7 * Math.max(1, Math.abs(v))))
            return;
        let group = groups.find(g => g.geometry === geometry && g.material === material && g.cast === node.castShadow &&
            g.receive === node.receiveShadow && g.layers === node.layers.mask && g.order === node.renderOrder && g.culled === node.frustumCulled);
        if (!group) {
            group = { geometry, material, cast: node.castShadow, receive: node.receiveShadow, layers: node.layers.mask,
                order: node.renderOrder, culled: node.frustumCulled, members: [] };
            groups.push(group);
        }
        group.members.push({ node, matrix, visible: node.visible });
    });
    const plans = groups.filter(g => g.members.length >= 3);
    if (!plans.length)
        return noop;
    for (const group of plans)
        for (const { node } of group.members) {
            const descriptor = Object.getOwnPropertyDescriptor(node, 'visible');
            if (!descriptor || !('value' in descriptor) || !descriptor.writable)
                throw new TypeError('Nonwritable House instance visibility.');
        }
    const batches = [];
    let closed = false;
    const releaseOwned = () => {
        let error;
        for (const group of plans)
            for (const member of group.members) {
                try {
                    member.node.visible = member.visible;
                }
                catch (e) {
                    error ??= e;
                }
            }
        // Borrowed geometry, materials and maps remain owned by the original model.
        for (const batch of batches) {
            try {
                scene.remove(batch);
            }
            catch (e) {
                error ??= e;
            }
            try {
                batch.dispose();
            }
            catch (e) {
                error ??= e;
            }
        }
        active.delete(scene);
        return error;
    };
    const cleanup = () => {
        if (closed)
            return;
        closed = true;
        const error = releaseOwned();
        if (error)
            throw error;
    };
    try {
        for (const group of plans) {
            const batch = new THREE.InstancedMesh(group.geometry, group.material, group.members.length);
            batches.push(batch);
            batch.name = 'InterestShield-House-Instance-Batch-' + batches.length;
            batch.castShadow = group.cast;
            batch.receiveShadow = group.receive;
            batch.layers.mask = group.layers;
            batch.renderOrder = group.order;
            batch.frustumCulled = group.culled;
            group.members.forEach((member, i) => batch.setMatrixAt(i, member.matrix));
            if (!batch.instanceMatrix.array.every(Number.isFinite))
                throw new RangeError('Nonfinite House instance storage.');
            const stored = new THREE.Matrix4();
            for (let i = 0; i < group.members.length; i++) {
                batch.getMatrixAt(i, stored);
                if (stored.determinant() <= 0)
                    throw new RangeError('Unrepresentable House instance storage.');
            }
            batch.instanceMatrix.needsUpdate = true;
            batch.computeBoundingBox();
            batch.computeBoundingSphere();
            if (!batch.boundingBox || batch.boundingBox.isEmpty() || !batch.boundingSphere ||
                ![...batch.boundingBox.min.toArray(), ...batch.boundingBox.max.toArray(), ...batch.boundingSphere.center.toArray(), batch.boundingSphere.radius].every(Number.isFinite) ||
                batch.boundingSphere.radius < 0)
                throw new RangeError('Invalid House instance bounds.');
        }
        Object.defineProperty(cleanup, 'proof', { value: Object.freeze({ batches: batches.length,
                hiddenMeshes: plans.reduce((n, g) => n + g.members.length, 0),
                avoidedOpaqueDraws: plans.reduce((n, g) => n + g.members.length - 1, 0), borrowedGeometryAndMaterials: true }), enumerable: true });
        for (const group of plans)
            for (const member of group.members)
                member.node.visible = false;
        scene.add(...batches);
        active.set(scene, cleanup);
        return cleanup;
    }
    catch (error) {
        closed = true;
        releaseOwned();
        throw error;
    }
}
