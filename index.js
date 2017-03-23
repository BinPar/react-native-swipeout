import NativeButtonImport from "./NativeButton";
import styles from "./styles";
import React, {Component, PropTypes} from "react";
import {PanResponder, TouchableHighlight, StyleSheet, Text, View, Animated, Easing} from "react-native";

const ATT_SEEK_TIMING = 150;
const ATT_SEEK_FRICTION = 2;
const ATT_SEEK_TENSION = 100;

export const NativeButton = NativeButtonImport;
export class SwipeoutButton extends Component {

	static propTypes = {
		backgroundColor: PropTypes.string,
		color: PropTypes.string,
		component: PropTypes.node,
		onPress: PropTypes.func,
		text: PropTypes.string,
		type: PropTypes.string,
		underlayColor: PropTypes.string,
		tension: PropTypes.number,
		friction: PropTypes.number
	};

	static defaultProps = {
		backgroundColor: null,
		color: null,
		component: null,
		underlayColor: null,
		height: 0,
		key: null,
		onPress: null,
		disabled: false,
		text: 'Click me',
		type: '',
		width: 0
	};

	render() {
		let {type, backgroundColor, height, width, color, component, text} = this.props;

		let styleSwipeoutBtn = [styles.swipeoutBtn];

		//  apply "type" styles (delete || primary || secondary)
		if (type === 'delete') styleSwipeoutBtn.push(styles.colorDelete);
		else if (type === 'primary') styleSwipeoutBtn.push(styles.colorPrimary);
		else if (type === 'secondary') styleSwipeoutBtn.push(styles.colorSecondary);

		//  apply background color
		if (backgroundColor) styleSwipeoutBtn.push({backgroundColor});

		styleSwipeoutBtn.push({
			height,
			maxWidth: width,
		});

		let styleSwipeoutBtnComponent = [styles.styleSwipeoutBtnComponent];

		//  set button dimensions
		styleSwipeoutBtnComponent.push({
			height,
			width
		});

		let styleSwipeoutBtnText = [styles.swipeoutBtnText];

		//  apply text color
		if (color) styleSwipeoutBtnText.push({color});

		styleSwipeoutBtn.unshift(styles.swipeoutBtnTouchable);
		return (
			<NativeButton
				onPress={this.props.onPress}
				style={styleSwipeoutBtn}
				underlayColor={this.props.underlayColor}
				disabled={this.props.disabled}
				textStyle={styleSwipeoutBtnText}>
				{
					(component ?
							<View style={styleSwipeoutBtnComponent}>{component}</View>
							:
							text
					)
				}
			</NativeButton>
		);
	}
}

export default class Swipeout extends Component {

	static propTypes = {
		autoClose: PropTypes.bool,
		backgroundColor: PropTypes.string,
		close: PropTypes.bool,
		left: PropTypes.array,
		onOpen: PropTypes.func,
		right: PropTypes.array,
		scroll: PropTypes.func,
		style: View.propTypes.style,
		sensitivity: PropTypes.number,
		initialAttentionSeeker: PropTypes.bool
	};

	static defaultProps = {
		rowID: -1,
		sectionID: -1,
		sensitivity: 0
	};

	constructor(props) {
		super(props);

		this.state = {
			autoClose: props.autoClose || false,
			btnDefaultWidth: 0,
			btnsLeftWidth: 0,
			btnsRightWidth: 0,
			contentHeight: 0,
			contentWidth: 0,
			openedRight: false,
			swiping: false,
			tweenDuration: 160,
			timeStart: null,
			_contentLeft: new Animated.Value(0)
		};

		this._posX = 0;
		this._contentPosLeft = new Animated.Value(0);
		this._contentPosRight = new Animated.Value(0);

		this._onLayout = this._onLayout.bind(this);
		this._handlePanResponderGrant = this._handlePanResponderGrant.bind(this);
		this._handlePanResponderMove = this._handlePanResponderMove.bind(this);
		this._handlePanResponderEnd = this._handlePanResponderEnd.bind(this);
		this._renderButton = this._renderButton.bind(this);
	}

	componentWillMount() {
		this._panResponder = PanResponder.create({
			onStartShouldSetPanResponder: (event, gestureState) => true,
			onMoveShouldSetPanResponder: (event, gestureState) =>
			Math.abs(gestureState.dx) > this.props.sensitivity &&
			Math.abs(gestureState.dy) > this.props.sensitivity,
			onPanResponderGrant: this._handlePanResponderGrant,
			onPanResponderMove: this._handlePanResponderMove,
			onPanResponderRelease: this._handlePanResponderEnd,
			onPanResponderTerminate: this._handlePanResponderEnd,
			onShouldBlockNativeResponder: (event, gestureState) => true,
		});
	}

	componentWillReceiveProps(nextProps) {
		if (nextProps.close) this._close();
	}

	_handlePanResponderGrant(e, gestureState) {
		if (this.props.onOpen) {
			this.props.onOpen(this.props.sectionID, this.props.rowID);
		}

		this.setState({
			swiping: true,
			timeStart: (new Date()).getTime(),
		});
	}

	_handlePanResponderMove(e, gestureState) {
		let posX = gestureState.dx;
		let posY = gestureState.dy;
		let leftWidth = this.state.btnsLeftWidth;
		let rightWidth = this.state.btnsRightWidth;
		if (this.state.openedRight) {
			posX = gestureState.dx - rightWidth;
		} else if (this.state.openedLeft) {
			posX = gestureState.dx + leftWidth;
		}

		if (this.props.scroll) {
			//  prevent scroll if moveX is true
			let moveX = Math.abs(posX) > Math.abs(posY);
			if(moveX !== this._scrollEnabled) {
				this._scrollEnabled = moveX;
				if (moveX) {
					this.props.scroll(false);
				} else {
					this.props.scroll(true);
				}
			}
		}

		if (this.state.swiping) {
			let limit = -rightWidth;
			//  move content to reveal swipeout
			if (posX < 0 && this.props.right) {
				posX = Math.min(posX, 0);
				this._posX = posX;
				this.state._contentLeft.setValue(this._rubberBandEasing(posX, limit));
				this.setState({ _contentLeft: this.state._contentLeft });
				this._contentPosRight.setValue(Math.abs(this.state.contentWidth + Math.max(limit, posX)));
			} else if (posX > 0 && this.props.left) {
				limit = leftWidth
				posX = Math.max(posX, 0);
				this._posX = posX;
				this.state._contentLeft.setValue(this._rubberBandEasing(posX, limit));
				this.setState({ _contentLeft: this.state._contentLeft });
				this._contentPosLeft.setValue(Math.min(posX, limit));
			}
		}
	}

	_handlePanResponderEnd(e, gestureState) {
		let posX = gestureState.dx;
		let contentWidth = this.state.contentWidth;
		let btnsLeftWidth = this.state.btnsLeftWidth;
		let btnsRightWidth = this.state.btnsRightWidth;
		//  minimum threshold to open swipeout
		let openX = contentWidth * 0.33;

		//  should open swipeout
		let openLeft = posX > openX || posX > btnsLeftWidth / 2;
		let openRight = posX < -openX || posX < -btnsRightWidth / 2;

		//  account for open swipeouts
		if (this.state.openedRight) {
			openRight = posX - openX < -openX;
		}
		if (this.state.openedLeft) {
			openLeft = posX + openX > openX;
		}

		//  reveal swipeout on quick swipe
		let timeDiff = (new Date()).getTime() - this.state.timeStart < 200;
		if (timeDiff) {
			openRight = posX < -openX / 10 && !this.state.openedLeft;
			openLeft = posX > openX / 10 && !this.state.openedRight;
		}

		if (this.state.swiping) {
			if (openRight && this._posX < 0 && posX < 0) {
				// open swipeout right
				this._tweenContent('right', true);
				this.setState({openedLeft: false, openedRight: true, swiping: false});
			} else if (openLeft && this._posX > 0 && posX > 0) {
				// open swipeout left
				this._tweenContent('left', true);
				this.setState({openedLeft: true, openedRight: false, swiping: false});
			}
			else {
				// close swipeout
				this._tweenContent(null, false);
				this.setState({openedLeft: false, openedRight: false, swiping: false});
			}
		}

		//  Allow scroll
		if (this.props.scroll) this.props.scroll(true);
	}

	_tweenContent(direction, open) {
		if(direction === null) {
			direction = this._posX < 0 ? 'right' : 'left';
		}
		let contentWidth = this.state.contentWidth;
		let btnsLeftWidth = this.state.btnsLeftWidth;
		let btnsRightWidth = this.state.btnsRightWidth;
		let contentPosEnd = 0;
		let contentLeftEnd = 0;
		let isRight = direction === 'right';
		if(open) {
			contentPosEnd = isRight ? Math.abs(contentWidth - btnsRightWidth) : btnsLeftWidth;
			contentLeftEnd = this._rubberBandEasing(isRight ? -btnsRightWidth : btnsLeftWidth);
		} else {
			contentPosEnd = isRight ? contentWidth : 0;
			contentLeftEnd = 0;
		}
		Animated.parallel([
			Animated.timing(this[`_contentPos${isRight ? 'Right' : 'Left'}`], {
				easing: Easing.inOut(Easing.quad),
				duration: contentPosEnd === 0 ? this.state.tweenDuration * 1.5 : this.state.tweenDuration,
				toValue: contentPosEnd
			}),
			Animated.timing(this.state._contentLeft, {
				easing: Easing.inOut(Easing.quad),
				duration: contentPosEnd === 0 ? this.state.tweenDuration * 1.5 : this.state.tweenDuration,
				toValue: contentLeftEnd
			})
		]).start();
	}

	_rubberBandEasing(value, limit) {
		if(value == null) {
			value = this._posX;
		}
		if(limit == null) {
			limit = -this.state.btnsRightWidth;
			if(value > 0) {
				limit = this.state.btnsLeftWidth;
			}
		}
		if (value < 0 && value < limit) return limit - Math.pow(limit - value, 0.85);
		else if (value > 0 && value > limit) return limit + Math.pow(value - limit, 0.85);
		return value;
	}

	_autoClose(btn) {
		let onPress = btn.onPress;
		if (onPress) onPress();
		if (this.state.autoClose) this._close();
	}

	_close() {
		this._tweenContent(null, false);
		this.setState({
			openedRight: false,
			openedLeft: false,
		});
	}

	attentionSeeker(params) {
		const { contentWidth, endPosLeft, endPosRight} = params;
		if(this.props.right) {
			this._contentPosRight.setValue(contentWidth);
			this.state._contentLeft.setValue(-1);
			this.setState({ _contentLeft: this.state._contentLeft });
			const anim1 = Animated.parallel([
				Animated.timing(this.state._contentLeft, {
					toValue: -30,
					duration: ATT_SEEK_TIMING
				}),
				Animated.timing(this._contentPosRight, {
					toValue: contentWidth - 30,
					duration: ATT_SEEK_TIMING
				})
			]);
			const anim2 = Animated.parallel([
				Animated.spring(this.state._contentLeft, {
					toValue: 0,
					friction: ATT_SEEK_FRICTION,
					tension: ATT_SEEK_TENSION
				}),
				Animated.spring(this._contentPosRight, {
					toValue: contentWidth,
					friction: ATT_SEEK_FRICTION,
					tension: ATT_SEEK_TENSION
				})
			]);
			this._runningAttentionSeeker = Animated.sequence([
				anim1,
				anim2
			]).start();
		} else if(this.props.left) {
			this.state._contentLeft.setValue(1);
			this.setState({ _contentLeft: this.state._contentLeft });
			const anim1 = Animated.parallel([
				Animated.timing(this.state._contentLeft, {
					toValue: 30,
					duration: ATT_SEEK_TIMING
				}),
				Animated.timing(this._contentPosRight, {
					toValue: 30,
					duration: ATT_SEEK_TIMING
				})
			]);
			const anim2 = Animated.parallel([
				Animated.spring(this.state._contentLeft, {
					toValue: 0,
					friction: ATT_SEEK_FRICTION,
					tension: ATT_SEEK_TENSION
				}),
				Animated.spring(this._contentPosRight, {
					toValue: 0,
					friction: ATT_SEEK_FRICTION,
					tension: ATT_SEEK_TENSION
				})
			]);
			this._runningAttentionSeeker = Animated.sequence([
				anim1,
				anim2
			]).start();
		}
	}

	_onLayout(event) {
		if(!this._initialized) {
			this._initialized = true;
			const {width, height} = event.nativeEvent.layout;
			let btnDefaultWidth = width / 5.0;
			let btnsLeftWidth = this.props.left ? (
					this.props.left.reduce((res, btn) => {
						return res + (btn.width || btnDefaultWidth);
					}, 0)
				) : 0;
			let btnsRightWidth = this.props.right ? (
					this.props.right.reduce((res, btn) => {
						return res + (btn.width || btnDefaultWidth);
					}, 0)
				) : 0;
			const endPosRight = Math.abs(width - btnsRightWidth);
			this.setState({
				btnDefaultWidth,
				btnsLeftWidth,
				btnsRightWidth,
				endPosLeft: btnsLeftWidth,
				endPosRight,
				contentWidth: width,
				contentHeight: height,
			}, () => {
				if(this.props.initialAttentionSeeker && !this._attentionSought) {
					this._attentionSought = true;
					this.attentionSeeker({
						endPosLeft: btnsLeftWidth,
						endPosRight,
						contentWidth: width
					});
				}
			});
		}
	}

	_renderButton(btn, i) {
		return (
			<SwipeoutButton
				backgroundColor={btn.backgroundColor}
				color={btn.color}
				component={btn.component}
				disabled={btn.disabled}
				height={this.state.contentHeight}
				key={i}
				onPress={() => this._autoClose(btn)}
				text={btn.text}
				type={btn.type}
				underlayColor={btn.underlayColor}
				width={btn.width || this.state.btnDefaultWidth}/>
		);
	}

	_renderButtons(buttons, isVisible, style) {
		if (buttons && isVisible) {
			return (
				<Animated.View style={style}>
					{ buttons.map(this._renderButton) }
				</Animated.View>
			);
		} else {
			return (
				<View/>
			);
		}
	}

	render() {
		let contentWidth = this.state.contentWidth;

		let styleSwipeout = [styles.swipeout, this.props.style];
		if (this.props.backgroundColor) {
			styleSwipeout.push({backgroundColor: this.props.backgroundColor});
		}

		let styleLeftPos = {
			left: {
				left: 0,
				overflow: 'hidden',
				width: this._contentPosLeft,
			},
		};
		let styleRightPos = {
			right: {
				left: this._contentPosRight,
				right: 0,
			},
		};
		let styleContentPos = {
			content: {
				left: this.state._contentLeft,
			},
		};

		let styleContent = [styles.swipeoutContent];
		styleContent.push(styleContentPos.content);

		let styleRight = [styles.swipeoutBtns];
		styleRight.push(styleRightPos.right);

		let styleLeft = [styles.swipeoutBtns];
		styleLeft.push(styleLeftPos.left);

		let isRightVisible = this.state._contentLeft._value < 0;
		let isLeftVisible = this.state._contentLeft._value > 0;
		return (
			<View style={styleSwipeout}>
				<Animated.View
					ref="swipeoutContent"
					style={styleContent}
					onLayout={this._onLayout}
					{...this._panResponder.panHandlers}>
					{this.props.children}
				</Animated.View>
				{ this._renderButtons(this.props.right, isRightVisible, styleRight) }
				{ this._renderButtons(this.props.left, isLeftVisible, styleLeft) }
			</View>
		);
	}
}