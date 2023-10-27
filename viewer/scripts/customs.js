const customFront = () => {
	camera.position.y = 200;
	camera.position.x = sceneRadiusForCamera;
}

const customPosition = () => {
	objectCopy.translateZ(-10);
	objectCopy.translateX(-50);
}

const customRotateLeft = (intensity) => {
	clearInterval(leftInterval);

	leftInterval = setInterval(() => {
		objectCopy.rotateZ(intensity < 1 ? -intensity : -1);
		rotation -= intensity < 1 ? intensity : 1;

		if (leftCounter++ >= intensity) {
			clearInterval(leftInterval);
			leftCounter = 0;
		}
	});
}

const customRotateRight = (intensity) => {
	clearInterval(rightInterval);

	rightInterval = setInterval(() => {
		objectCopy.rotateZ(intensity < 1 ? intensity : 1);
		rotation += intensity < 1 ? intensity : 1;

		if (rightCounter++ >= intensity) {
			clearInterval(rightInterval);
			rightCounter = 0;
		}
	});
}