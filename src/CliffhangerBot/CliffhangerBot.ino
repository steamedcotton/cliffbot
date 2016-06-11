#include <AccelStepper.h>
#include <Servo.h>

#define HALFSTEP 8

#define motorPin1  8     // IN1 on ULN2003 ==> Blue   on 28BYJ-48
#define motorPin2  9     // IN2 on ULN2004 ==> Pink   on 28BYJ-48
#define motorPin3  10    // IN3 on ULN2003 ==> Yellow on 28BYJ-48
#define motorPin4  11    // IN4 on ULN2003 ==> Orange on 28BYJ-48

#define flagServoPin 7

int endPoint = 1024 * 4;        // Move this many steps - 1024 = approx 1/4 turn

// NOTE: The sequence 1-3-2-4 is required for proper sequencing of 28BYJ-48
AccelStepper stepper1(HALFSTEP, motorPin1, motorPin3, motorPin2, motorPin4);

Servo myservo;
int pos = 0;

void setup() {
    Serial.begin(115200);
    pinMode(13, OUTPUT);
    myservo.attach(flagServoPin);

    stepper1.setMaxSpeed(900.0);
    stepper1.setAcceleration(100.0);
    stepper1.setSpeed(450);

    Serial.println("ready");
    flagDown();
}

void loop() {
	char inSerial[15];
	int i=0;
	delay(1000);
	if (Serial.available() > 0)   {
		while (Serial.available() > 0) {
			inSerial[i]=Serial.read(); //read data
			i++;
		}
		inSerial[i]='\0';

        String fullCmdString = String(inSerial);
        int deliminatorPos = fullCmdString.indexOf(':');
        String command = "";
        int value = 0;
        if (deliminatorPos > 0) {
            command = fullCmdString.substring(0, deliminatorPos);
            value = fullCmdString.substring(deliminatorPos+1).toInt();
        } else {
            command = fullCmdString;
        }

		if(command == "ledon") {
		  digitalWrite(13, HIGH);
		  Serial.println("LED-ON");
		}
		if(command == "leboff") {
			digitalWrite(13, LOW);
            Serial.println("LED-OFF");
		}

        if(command == "flagup") {
            flagUp();
        }

        if(command == "flagdown") {
            flagDown();
        }

        if(command == "climberup") {
            climberGoUp(4000);
        }

        if(command == "climberdown") {
            climberGoDown(4000);
        }

        if(command == "go") {
            climberGoUp(value);
        }

        if(command == "sethome") {
            climberSetHome();
        }

        if(command == "gohome") {
            climberGoHome();
        }

    }
}

void climberGoDown(int steps) {
  stepper1.moveTo(stepper1.currentPosition() + steps);
  while (stepper1.distanceToGo() != 0) {
      stepper1.run();
  }
  returnCurrentPositionJSON("going down");
}

void climberGoUp(int steps) {
  stepper1.moveTo(stepper1.currentPosition() - steps);
  while (stepper1.distanceToGo() != 0) {
      stepper1.run();
  }
  returnCurrentPositionJSON("going up");
}

void climberGoHome() {
  stepper1.moveTo(0);
  while (stepper1.distanceToGo() != 0) {
      stepper1.run();
  }
  returnCurrentPositionJSON("going home");
}

void climberSetHome() {
  stepper1.setCurrentPosition(0);
  returnCurrentPositionJSON("this is my home");
}


void returnCurrentPositionJSON(String action) {
  Serial.print("{\"currentPos\": ");
  Serial.print(stepper1.currentPosition());
  Serial.print(", \"action\": \"");
  Serial.print(action);
  Serial.println("\"}");
}

void returnSuccessActionJSON(String action) {
  Serial.print("{\"action\": \"");
  Serial.print(action);
  Serial.println("\"}");
}
void flagUp(){
  myservo.write(100);
  returnSuccessActionJSON("flagup");
}

void flagDown(){
  myservo.write(0);
  returnSuccessActionJSON("flagdown");
}

