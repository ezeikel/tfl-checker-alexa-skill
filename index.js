const axios = require("axios");

const lineList = "Bakerloo, Central, District, Hammersmith & City, Jubilee, Metropolitan, Northern, Piccadilly, Victoria, Waterloo & City";

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = (event, context) => {
    try {
        console.log("event.session.application.applicationId=" + event.session.application.applicationId);

        /**
         * Uncomment this if statement and populate with your skill's application ID to
         * prevent someone else from configuring a skill that sends requests to this function.
         */

        if (event.session.application.applicationId !== "amzn1.ask.skill.43274639-6b10-4b7f-ba14-98dbef51dcf5") {
            context.fail("Invalid Application ID");
        }

        if (event.session.new) {
            onSessionStarted({ requestId: event.request.requestId }, event.session);
        }

        if (event.request.type === "LaunchRequest") {
            onLaunch(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "IntentRequest") {
            onIntent(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "SessionEndedRequest") {
            onSessionEnded(event.request, event.session);
            context.succeed();
        }
    } catch (e) {
        context.fail("Exception: " + e);
    }
};

/**
 * Called when the session starts.
 */
const onSessionStarted = (sessionStartedRequest, session) => {
    // add any session init logic here
}

/**
 * Called when the user invokes the skill without specifying what they want.
 */
const onLaunch = (launchRequest, session, callback) => {
    getWelcomeResponse(callback);
}

/**
 * Called when the user specifies an intent for this skill.
 */
const onIntent = (intentRequest, session, callback) => {

    const intent = intentRequest.intent;
    const intentName = intentRequest.intent.name;

    // dispatch custom intents to handlers here
    if (intentName == "LineIntent") {
        handleLineResponse(intent, session, callback);
    } else if (intentName == "AMAZON.YesIntent") {
        handleYesResponse(intent, session, callback);
    } else if (intentName == "AMAZON.NoIntent") {
        handleNoResponse(intent, session, callback);
    } else if (intentName == "AMAZON.HelpIntent") {
        handleGetHelpRequest(intent, session, callback);
    } else if (intentName == "AMAZON.StopIntent") {
        handleFinishSessionRequest(intent, session, callback);
    } else if (intentName == "AMAZON.CancelIntent") {
        handleFinishSessionRequest(intent, session, callback);
    } else {
        throw "Invalid intent";
    }
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
const onSessionEnded = (sessionEndedRequest, session) => {

}

// ------- Skill specific logic -------

const getWelcomeResponse = (callback) => {
    const speechOutput = `Welcome to TFL Checker! I can tell you about all the tube lines: ${lineList}. I can only give facts about one at a time. Which line are you interested in?`;

    const reprompt = `Which line are you interested in? You can find out about ${lineList}.`;

    const header = "Tube Line Status";

    const shouldEndSession = false;

    const sessionAttributes = {
        "speechOutput": speechOutput,
        "repromptText": reprompt
    }

    callback(sessionAttributes, buildSpeechletResponse(header, speechOutput, reprompt, shouldEndSession))

}

const handleLineResponse = (intent, session, callback) => {
    let input = intent.slots.Line.value;
    let header;
    let speachOutput;
    let repromptText;

    if (!input) {
        speechOutput = `I didn't quite catch that. Try asking about a line like ${lineList}.`;
        repromptText = `Try asking about a line like ${lineList}`;
        header = "No Line Specified";

        const shouldEndSession = false;

        callback(session.attributes, buildSpeechletResponse(header, speechOutput, repromptText, shouldEndSession));    
    } else {
        input = input.toLowerCase();
        let lines;
    
        axios('https://api.tfl.gov.uk/line/mode/tube/status')
            .then(response => {
                lines = response.data;
                const matchedLine = lines.filter(line => line.id === input);
            
                if (matchedLine.length === 0) {
                    speechOutput = `That line doesn't seem to exist. Try asking about another like ${lineList}.`;
                    repromptText = "Try asking about another line";
                    header = "Line Not Found";
                } else {
                    const status = matchedLine[0].lineStatuses[0].statusSeverityDescription;
                    speechOutput = `The ${matchedLine[0].name} line is operating a ${status}. Do you want to hear about more lines?`;
                    repromptText = "Do you want to hear about more lines?";
                    header = matchedLine[0].name;
                }
            
                const shouldEndSession = false;
            
                callback(session.attributes, buildSpeechletResponse(header, speechOutput, repromptText, shouldEndSession));
            });
    }


}

const handleYesResponse = (intent, session, callback) => {
    const speechOutput = `Great! Which line? You can find out about ${lineList}.`;
    const repromptText = speechOutput;
    const shouldEndSession = false;

    callback(session.attributes, buildSpeechletResponseWithoutCard(speechOutput, repromptText, shouldEndSession));
}

const handleNoResponse = (intent, session, callback) => {
    handleFinishSessionRequest(intent, session, callback);
}

const handleGetHelpRequest = (intent, session, callback) => {
    // Ensure that session.attributes has been initialized
    if (!session.attributes) {
        session.attributes = {};
    }

    const speechOutput = `I can tell you about the tube status for: ${lineList}. Which line are you interested in? Remember, I can only give facts about one line at a time.`;

    const repromptText = speechOutput;

    const shouldEndSession = false;

    callback(session.attributes, buildSpeechletResponseWithoutCard(speechOutput, repromptText, shouldEndSession));

}

const handleFinishSessionRequest = (intent, session, callback) => {
    // End the session with a "Good bye!" if the user wants to quit the game
    callback(session.attributes,
        buildSpeechletResponseWithoutCard("Good bye! Thank you for using TFL Checker!", "", true));
}


// ------- Helper functions to build responses for Alexa -------


const buildSpeechletResponse = (title, output, repromptText, shouldEndSession) => {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        card: {
            type: "Simple",
            title: title,
            content: output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

const buildSpeechletResponseWithoutCard = (output, repromptText, shouldEndSession) => {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

const buildResponse = (sessionAttributes, speechletResponse) => {
    return {
        version: "1.0",
        sessionAttributes: sessionAttributes,
        response: speechletResponse
    };
}