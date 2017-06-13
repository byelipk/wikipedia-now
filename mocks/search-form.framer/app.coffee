# NOTE
# There's a bug in Framer Designer where if you create a
# text layer, Framer converts it to a normal layer. We
# can't interact with it like a text layer.
ButtonText = new TextLayer
	text: "Search Wikipedia Now"
	color: new Color("white")
	superLayer: Button

ButtonText.center()


# SETUP CODE
Button.states =
	mouseover:
		backgroundColor: "#fff"
	clicked:
		x: -300
		opacity: 0
		animationOptions:
			curve: Bezier.ease 
			time: 0.3

SearchForm.opacity = 0
SearchForm.scale = 0.95
SearchForm.states =
	revealed:
		scale: 1
		opacity: 1
		animationOptions:
			curve: Bezier.ease
			time: 0.5
			delay: 0.3

ButtonText.states =
	mouseover:
		color: "#0275D8"

Copy.states =
	scaled:
		scale: 1.1
		
Button.on Events.MouseOver, () ->
	Button.stateSwitch("mouseover")
	ButtonText.stateSwitch("mouseover")

Button.on Events.MouseOut, () ->
	unless SearchForm.visible
		Button.stateSwitch("default")
		ButtonText.stateSwitch("default")

Button.on Events.Click, () ->
	Button.animate("clicked")
	
	SearchForm.visible = true 
	SearchForm.animate("revealed")
	Copy.animate("scaled")

Close.on Events.Click, () ->
	Copy.animate("default")
	SearchForm.animate("default")
	Button.animate("default")	
	ButtonText.stateSwitch("default")
	
