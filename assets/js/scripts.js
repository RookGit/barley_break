"use strict";

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _instanceof(left, right) { if (right != null && typeof Symbol !== "undefined" && right[Symbol.hasInstance]) { return right[Symbol.hasInstance](left); } else { return left instanceof right; } }

function _classCallCheck(instance, Constructor) { if (!_instanceof(instance, Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * class Game - игровые процессы, новая игра, пауза и т.п
 * class Request - общение с сервером
 * class Timer - управление таймером
 */
var debug = false,
    timer = null,
    game = null,
    server_api = '/api';

function log() {
    for (var _len = arguments.length, mess = new Array(_len), _key = 0; _key < _len; _key++) {
        mess[_key] = arguments[_key];
    }

    if (debug) console.log(mess);
}

function arrayMoveElement(arr, fromIndex, toIndex) {
    var element = arr[fromIndex];
    arr.splice(fromIndex, 1);
    arr.splice(toIndex, 0, element);
    return arr;
}

var Game =
    /*#__PURE__*/
    function () {
        function Game() {
            _classCallCheck(this, Game);

            // Прошло времени
            this.time = 0; // Прошло ходов

            this.stroke = 0; // Стоит ли пауза

            this.pause = true; // Начата ли игра

            this.start = false; // Последний сдвинутый блок

            this.last_action_block = {
                // Откуда
                'from': {
                    'column': null,
                    'row': null
                },
                // Куда
                'in': {
                    'column': null,
                    'row': null
                },
                // Запоминаем тип свайпа, чтобы проще было откатиться на ход назад
                'last_type_swipe': null,
                // Время хода
                'time': 0
            }; // История ходов

            this.stroke_history = []; // Игровые блоки

            this.blocks = [[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 0]]; // Устанавливаем таймер

            Timer.setTime(this.time); // Устанавливаем блоки

            this.setBlocks();
        } // Установить блоки


        _createClass(Game, [{
            key: "setBlocks",
            value: function setBlocks() {
                var string_blocks = '';

                for (var i = 0; i < 4; i++) {
                    for (var j = 0; j < 4; j++) {
                        var value = this.blocks[i][j];
                        if (value !== 0) string_blocks += '<div class="game_block">' + value + '</div>';else string_blocks += '<div class="game_null_block">&nbsp;</div>';
                    }
                }

                $('.game_field').empty().append(string_blocks);
                return this;
            } // Установить количество ходов

        }, {
            key: "setStroke",
            value: function setStroke() {
                $('[data-context="stroke"]').text(this.stroke);
                return this;
            } // Установить кнопки

        }, {
            key: "setButtons",
            value: function setButtons() {
                var dom_buttons = '<h2>Игра "Пятнашки":</h2>';
                dom_buttons += '<button data-click="new_game" type="button" class="btn btn-warning">Новая игра</button>';
                if (this.start === true) if (this.pause === false) {
                    dom_buttons += '<br><button data-click="pause" type="button" class="btn btn-warning">Пауза</button>';
                } else {
                    dom_buttons += '<br><button data-click="continue" type="button" class="btn btn-warning">Продолжить игру</button>';
                }
                $('.buttons_field').empty().append(dom_buttons);
                return this;
            } // Перемешать блоки

        }, {
            key: "randBlocks",
            value: function randBlocks() {
                var method_sort = function method_sort(a, b) {
                    return Math.random() - 0.5;
                }; // Перемешиваем строки по одиночке


                for (var i = 0; i < 4; i++) {
                    this.blocks[i].sort(method_sort);
                } // Перемешиваем строки


                this.blocks.sort(method_sort);
                return this;
            }
            /**
             * Обработка свайпов
             *
             * @param {string} type - тип свайпа
             * @returns {boolean} - обработан ли свайп
             */

        }, {
            key: "handlerSwipe",
            value: function handlerSwipe(type) {
                if (this.pause === false && this.start === true) {
                    // Для записи последнего хода. Какая ячейка сдвинулась (Где была и где стала)
                    var last_column, last_row, will_column, will_row;
                    var start_stroke = this.stroke;

                    switch (type) {
                        // Свайп вправо
                        case 'right':
                            for (var i = 0; i < 4; i++) {
                                var arr = this.blocks[i];
                                var position_zero = arr.indexOf(0);

                                if (position_zero != -1) {
                                    var new_position = position_zero - 1;

                                    if (new_position > -1) {
                                        // Строка была
                                        last_row = i; // Строка стала

                                        will_row = i; // Колонка была

                                        last_column = new_position; // Колонка стала

                                        will_column = position_zero;
                                        this.blocks[i] = arrayMoveElement(arr, new_position, position_zero);
                                        this.setBlocks();
                                    } else this.stroke--;

                                    break;
                                }
                            }

                            break;
                        // Свайп влево

                        case 'left':
                            for (var _i = 0; _i < 4; _i++) {
                                var _arr = this.blocks[_i];

                                var _position_zero = _arr.indexOf(0);

                                if (_position_zero != -1) {
                                    var _new_position = _position_zero + 1;

                                    if (_new_position < 4) {
                                        // Строка была
                                        last_row = _i; // Строка стала

                                        will_row = _i; // Колонка была

                                        last_column = _new_position; // Колонка стала

                                        will_column = _position_zero;
                                        this.blocks[_i] = arrayMoveElement(_arr, _new_position, _position_zero);
                                        this.setBlocks();
                                    } else this.stroke--;

                                    break;
                                }
                            }

                            break;
                        // Свайп вверх

                        case 'up': // Свайп вниз

                        case 'down':
                            var row = null,
                                column = null; // Узнаем row и column где 0

                            for (var _i2 = 0; _i2 < 4; _i2++) {
                                var _arr2 = this.blocks[_i2];

                                var _position_zero2 = _arr2.indexOf(0);

                                if (_position_zero2 != -1) {
                                    // Строка стала
                                    will_row = _i2; // Колонка была

                                    last_column = _position_zero2; // Колонка стала

                                    will_column = _position_zero2;
                                    row = _i2;
                                    column = _position_zero2;
                                    break;
                                }
                            }

                            if (type === 'up') {
                                log('Строка: ', row, ' / Колонка: ', column);
                                var down_row = row + 1;

                                if (down_row < 4) {
                                    // Строка была
                                    last_row = down_row;
                                    var down_value = this.blocks[down_row][column];
                                    log('Нижняя позиция: ', down_value);
                                    this.blocks[down_row][column] = 0;
                                    this.blocks[row][column] = down_value;
                                    this.setBlocks();
                                } else this.stroke--;
                            } else if (type === 'down') {
                                log('Строка: ', row, ' / Колонка: ', column);
                                var up_row = row - 1;

                                if (up_row > -1) {
                                    // Строка была
                                    last_row = up_row;
                                    var up_value = this.blocks[up_row][column];
                                    log('Верхняя позиция: ', up_value);
                                    this.blocks[up_row][column] = 0;
                                    this.blocks[row][column] = up_value;
                                    this.setBlocks();
                                } else this.stroke--;
                            }

                            break;

                        default:
                            return false;
                            break;
                    } // Увеличиваем количество ходов


                    this.stroke++;
                    this.setStroke();
                    log('Ячейка была на колонке: ' + last_column, 'Стала на колонке ' + will_column);
                    log('Ячейка была на строке: ' + last_row, 'Стала на строке ' + will_row); // Добавляем ход в историю, если он валидный и отправляем на сервер

                    if (this.stroke > start_stroke) {
                        this.stroke_history[this.stroke_history.length] = type;
                        this.last_action_block = {
                            // Откуда
                            'from': {
                                'column': last_column + 1,
                                'row': last_row + 1
                            },
                            // Куда
                            'in': {
                                'column': will_column + 1,
                                'row': will_row + 1
                            },
                            // Запоминаем тип свайпа, чтобы проще было откатиться на ход назад
                            'last_type_swipe': type,
                            // Время хода
                            'time': this.time
                        }; // Отправляем данные на сервер последнего хода

                        Request.sendData(this.last_action_block);
                    }

                    return true;
                } else return false;
            }
        }, {
            key: "checkWin",
            value: function checkWin() {
                // Число для сравнения
                var number = 0; // Помечаем, что человек выиграл

                var result = true;

                for (var i = 0; i < 4; i++) {
                    if (result) for (var j = 0; j < 4; j++) {
                        number++;
                        var value = this.blocks[i][j];

                        if (value !== number && value != 0) {
                            result = false;
                            break;
                        }
                    }
                }

                if (result === true) {
                    alert('Вы выиграли!'); // Начинаем новую игру

                    $('[data-click="new_game"]').trigger('click');
                } else log('Вы не выиграли!');

                return result;
            }
        }]);

        return Game;
    }();

var Timer =
    /*#__PURE__*/
    function () {
        function Timer() {
            _classCallCheck(this, Timer);
        }

        _createClass(Timer, null, [{
            key: "setTime",
            // Установить время в секундах
            value: function setTime(time) {
                if (typeof time === 'number') $('[data-context="timer"]').text(Timer.getTimerByNumber(time));else throw new TypeError('Ошибка, для таймера должно передаваться число!');
            }
            /**
             * Получить строку вида H:mm:ss
             *
             * @param {integer} number - количество секунд
             * @returns {string} - строка прошедшем временем в формате H:mm:ss
             */

        }, {
            key: "getTimerByNumber",
            value: function getTimerByNumber(number) {
                var date = new Date(null);
                date.setSeconds(number);
                return date.toISOString().substr(11, 8);
            }
        }, {
            key: "startTimer",
            value: function startTimer() {
                Timer.stopTimer();
                timer = setInterval(function () {
                    game.time++;
                    Timer.setTime(game.time);
                }, 1000);
            }
        }, {
            key: "stopTimer",
            value: function stopTimer() {
                clearInterval(timer);
            }
        }]);

        return Timer;
    }();

var Request =
    /*#__PURE__*/
    function () {
        function Request() {
            _classCallCheck(this, Request);
        }

        _createClass(Request, null, [{
            key: "sendData",
            value: function sendData(object_game) {
                if (_typeof(object_game) === 'object') {
                    var params = new Array();
                    params.push({
                        name: 'data[method]',
                        value: 'example_name_method'
                    });
                    params.push({
                        name: 'data[data_game]',
                        value: JSON.stringify(object_game)
                    }); // Время отправления запроса

                    params.push({
                        name: 'data[time_request]',
                        value: $.now()
                    });
                    Request.sendRequest(params);
                }
            }
        }, {
            key: "sendRequest",
            value: function sendRequest(params) {
                $.ajax({
                    type: 'POST',
                    url: server_api,
                    // dataType: 'json',
                    // async: false,
                    data: params,
                    success: function success(data) {// ...
                    },
                    error: function error(data) {// ...
                    }
                });
            }
        }]);

        return Request;
    }();

$(document).ready(function () {
    game = new Game();
    game.setButtons();
    $("body").keypress(function (event) {
        var keyCode = event.which;
        var result = false;

        switch (keyCode) {
            case 119:
            case 1094:
                log('Кнопка вверх');
                result = game.handlerSwipe('up');
                break;

            case 115:
            case 1099:
                log('Кнопка вниз');
                result = game.handlerSwipe('down');
                break;

            case 1092:
            case 97:
                log('Кнопка влево');
                result = game.handlerSwipe('left');
                break;

            case 100:
            case 1074:
                log('Кнопка вправо');
                result = game.handlerSwipe('right');
                break;
        }

        if (result === true) {
            log('Кнопка обработана'); // Проверяем выиграл ли пользователь (После каждого хода)

            game.checkWin();
        }
    });
    $(document).on('click', '[data-click]', function (event) {
        var context_click = $(this).data('click');
        var result = true;

        switch (context_click) {
            case 'new_game':
                game = new Game();
                game.start = true;
                game.pause = false;
                game.randBlocks().setBlocks().setStroke().setButtons();
                Timer.startTimer();
                break;

            case 'pause':
                game.pause = true;
                game.setButtons();
                Timer.stopTimer();
                break;

            case 'continue':
                game.pause = false;
                game.setButtons();
                Timer.startTimer();
                break;

            case 'scroll_down':
                $('html,body').stop().animate({
                    scrollTop: $('.buttons_field').offset().top
                }, 1000);
                break;

            default:
                result = false;
                break;
        }
    });
});