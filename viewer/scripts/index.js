window.onload = () => {
	setTimeout(() => {
		customPosition();
		customFront();

        // prevent three js prespective camera from moving
        //controls.noRotate = true;
	}, 1500);
}

let rotation = 0;
const zoomIntensity = 30;
const rotationIntensity = 55;
let leftCounter = 0, rightCounter = 0;
let leftInterval, rightInterval;

document.addEventListener("wheel", e => {
	if (rotation) {
		console.log(rotation);
		objectCopy.rotateZ(-rotation);
		rotation = 0;
	}

	//scrolled down
	if (e.deltaY > 0) {
		objectCopy.translateZ(-zoomIntensity);
		objectCopy.translateX(-zoomIntensity*2);
	}
	// scrolled up
	else {
		objectCopy.translateZ(zoomIntensity);
		objectCopy.translateX(zoomIntensity*2);
	}
	
});

let mousedown = false;
document.addEventListener("mousedown", () => mousedown = true);
document.addEventListener("mouseup", () => mousedown = false);

const mouseMoveDelay = 1;
let mouseMoveCounter = 0;
document.addEventListener("mousemove", e => {
	e.preventDefault();
	if (!mousedown || mouseMoveCounter++ < mouseMoveDelay) return;

	// if left click
	if (e.buttons == 1) {
		mouseMoveCounter = 0;

		// if moving left
		if (e.movementX < 0)
			customRotateLeft(0.1);

		// if moving right
		if (e.movementX > 0)
			customRotateRight(0.1);
	}
});