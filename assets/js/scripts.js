"use strict";

function _instanceof(left, right) { if (right != null && typeof Symbol !== "undefined" && right[Symbol.hasInstance]) { return right[Symbol.hasInstance](left); } else { return left instanceof right; } }

function _classCallCheck(instance, Constructor) { if (!_instanceof(instance, Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * Игра "Пятнашки"
 *
 * class Game - игровые процессы, новая игра, пауза и т.п
 * class Request - общение с сервером
 * class Timer - управление таймером
 * class DataStorage - управление данными
 *
 * var {Bool} debug - включить логирование
 * var {Bool} easy_game - режим легкой игры
 * var {Game} game - глобальный объект с данными
 * var {Object} timer - глобальный объект для setInterval
 * var {String} server_api - куда будет отправляться XHR
 */
var debug = false,
    timer = null,
    game = null,
    server_api = '/api',
    easy_game = false;

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
                'time': 0,
                // Значение ячейки
                'value': null
            }; // История ходов

            this.stroke_history = []; // Позиция курсора в истории ходов

            this.cursor_position_history = 0; // Игровые блоки

            this.blocks = [[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 0]];
        } // Инициализация


        _createClass(Game, [{
            key: "init",
            value: function init() {
                // Устанавливаем таймер
                Timer.setTime(this.time);
                if (this.pause === false && this.start === true) Timer.startTimer();
                this.setStroke(); // Устанавливаем блоки

                this.setBlocks();
            } // Установить блоки

        }, {
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

                if (this.start === true) {
                    $('[data-click="history"]').fadeIn(300); // Если не стоит пауза

                    if (this.pause === false) {
                        dom_buttons += '<br><button data-click="pause" type="button" class="btn btn-warning">Пауза</button>';
                        dom_buttons += "\n                    <br>\n                    <div data-context=\"next_last_buttons\" class=\"btn-group\" role=\"group\">\n                      <button data-click=\"last_stroke\" type=\"button\" class=\"btn btn-warning\">< \u041E\u0442\u043C\u0435\u043D\u0438\u0442\u044C</button>\n                      <button data-click=\"next_stroke\" type=\"button\" class=\"btn btn-warning\">\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C ></button>\n                    </div>\n                    ";
                    } else {
                        // Если стоит пауза
                        dom_buttons += '<br><button data-click="continue" type="button" class="btn btn-warning">Продолжить игру</button>';
                    }
                } else {
                    $('[data-click="history"]').fadeOut(300);
                }

                $('.buttons_field').empty().append(dom_buttons); // При каждой генерации кнопок управления - проверяем актуальность кнопок управления ходами

                this.checkNextLastButtons();
                return this;
            } // Перемешать блоки

        }, {
            key: "randBlocks",
            value: function randBlocks() {
                // Если включен режим легкой игры
                if (easy_game) {
                    this.blocks = [[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 0], [13, 14, 15, 12]];
                } else {
                    var method_sort = function method_sort(a, b) {
                        return Math.random() - 0.5;
                    }; // Перемешиваем строки по одиночке


                    for (var i = 0; i < 4; i++) {
                        this.blocks[i].sort(method_sort);
                    } // Перемешиваем строки


                    this.blocks.sort(method_sort);
                }

                return this;
            }
            /**
             * Обработка свайпов
             *
             * @param {string} type - тип свайпа
             * @param {boolean} add_stroke - нужно ли добавлять ход
             * @returns {boolean} - обработан ли свайп
             */

        }, {
            key: "handlerSwipe",
            value: function handlerSwipe(type) {
                var add_stroke = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;

                if (this.pause === false && this.start === true) {
                    // Для записи последнего хода. Какая ячейка сдвинулась (Где была и где стала)
                    var last_column, last_row, will_column, will_row, value_cell;
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
                                        this.blocks[i] = arrayMoveElement(arr, new_position, position_zero); // Получаем значение перемещаемой ячейки

                                        value_cell = this.blocks[i][position_zero];
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
                                        this.blocks[_i] = arrayMoveElement(_arr, _new_position, _position_zero); // Получаем значение перемещаемой ячейки

                                        value_cell = this.blocks[_i][_position_zero];
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
                                    this.blocks[row][column] = down_value; // Получаем значение перемещаемой ячейки

                                    value_cell = down_value;
                                    this.setBlocks();
                                } else this.stroke--;
                            } else if (type === 'down') {
                                log('Строка: ', row, ' / Колонка: ', column);
                                var up_row = row - 1;

                                if (up_row > -1) {
                                    // Строка была
                                    last_row = up_row;
                                    var up_value = this.blocks[up_row][column];
                                    log('Верхняя позиция: ', up_value); // Получаем значение перемещаемой ячейки

                                    value_cell = up_value;
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
                    this.setStroke(); // Добавляем ход в историю, если он валидный и отправляем на сервер

                    if (this.stroke > start_stroke && add_stroke) {
                        // log('Ячейка была на колонке: ' + last_column, 'Стала на колонке ' + will_column);
                        // log('Ячейка была на строке: ' + last_row, 'Стала на строке ' + will_row);
                        // Отсекаем возможность повтора
                        game.stroke_history.length = game.cursor_position_history;
                        game.cursor_position_history++;
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
                            'time': this.time,
                            'value': value_cell
                        }; // Добавляем данные в историю

                        this.addItemHistory('last_stroke'); // Отправляем данные на сервер последнего хода
                        // с запуском на сервере абстрактного метода save_data_of_last_stroke

                        Request.sendDataWithWrapper(this.last_action_block, 'save_data_of_last_stroke');
                    } // Проверяем отображать ли кнопки отменить / повторить


                    this.checkNextLastButtons(); // Сохраняем данные после каждого хода

                    DataStorage.saveGameData(game);
                    return true;
                } else return false;
            } // Добавить последний ход в историю

        }, {
            key: "addItemHistory",
            value: function addItemHistory(type) {
                // Добавляемый элемент
                var element = null;

                switch (type) {
                    case 'new_game':
                        var now = new Date();
                        element = "\n                    <div data-cotext=\"alert_new_game\" class=\"element_history\">\n                    <b>\u0418\u0433\u0440\u0430 \u043D\u0430\u0447\u0430\u043B\u0430\u0441\u044C!</b><br>\u0412 ".concat(now.toLocaleTimeString(), "\n                    </div>\n                ");
                        $('.history_stroke').empty();
                        break;

                    case 'next_stroke':
                        element = "\n                    <div data-cotext=\"next_stroke\" class=\"element_history bg-dark text-light\">\n                    <b>\u041F\u043E\u0432\u0442\u043E\u0440 \u0445\u043E\u0434\u0430!</b>\n                    </div>\n                ";
                        break;

                    case 'win':
                        element = "\n                    <div data-cotext=\"next_stroke\" class=\"element_history bg-success\">\n                    <b>\u0412\u044B \u0432\u044B\u0438\u0433\u0440\u0430\u043B\u0438!</b>\n                    </div>\n                ";
                        break;

                    case 'last_stroke_rollback':
                        element = "\n                    <div data-cotext=\"last_stroke_rollback\" class=\"element_history bg-info\">\n                    <b>\u041E\u0442\u043C\u0435\u043D\u0430 \u0445\u043E\u0434\u0430!</b>\n                    </div>\n                ";
                        break;

                    case 'pause':
                        var now = new Date();
                        element = "\n                    <div data-cotext=\"alert_pause\" class=\"element_history bg-danger text-light\">\n                    <b>\u041F\u0430\u0443\u0437\u0430!</b><br>\u0412 ".concat(now.toLocaleTimeString(), "\n                    </div>\n                ");
                        break;

                    case 'continue':
                        var now = new Date();
                        element = "\n                    <div data-cotext=\"alert_continue\" class=\"element_history bg-primary text-light\">\n                    <b>\u0418\u0433\u0440\u0430 \u043F\u0440\u043E\u0434\u043E\u043B\u0436\u0430\u0435\u0442\u0441\u044F :)</b><br>\u0412 ".concat(now.toLocaleTimeString(), "\n                    </div>\n                ");
                        break;

                    case 'last_stroke':
                        var last_swipe = this.last_action_block.last_type_swipe;
                        var last_time = this.last_action_block.time;
                        var last_element_value = this.last_action_block.value;
                        element = "\n        \n                    <div data-cotext=\"last_stroke\" class=\"element_history\">\n                    <b>\u0411\u043B\u043E\u043A: ".concat(last_element_value, "</b> | ").concat(Timer.getTimerByNumber(last_time), "\n                    </div>\n                \n                ");
                        break;
                }

                if (element != null) {
                    $('.history_stroke').append(element).scrollTop(document.querySelector('.history_stroke').scrollHeight);
                }
            } // Проверить выиграл ли пользователь

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
                    // Останавливаем таймер
                    Timer.stopTimer();
                    this.addItemHistory('win');
                    $('input[name="count_stroke"]').val(game.stroke);
                    $('input[name="time"]').val(game.time);
                    $('#modal_save_result').modal('show');
                }

                return result;
            } // Откат хода

        }, {
            key: "rollbackStroke",
            value: function rollbackStroke(last_type_swipe) {
                var need_inversion = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
                // Противоположные свайпы
                var swipe_inversion = {
                    'left': 'right',
                    'right': 'left',
                    'up': 'down',
                    'down': 'up'
                };

                if (last_type_swipe in swipe_inversion) {
                    var rollback_swipe = swipe_inversion[last_type_swipe]; // Совершаем противоположное действие и не добавляем ход в историю

                    return need_inversion ? this.handlerSwipe(rollback_swipe, false) : this.handlerSwipe(last_type_swipe, false);
                }
            } // Получить предыдущий свайп

        }, {
            key: "getLastStrokeSwipe",
            value: function getLastStrokeSwipe() {
                return this.stroke_history[this.cursor_position_history - 1];
            } // Получить последующий свайп

        }, {
            key: "getNextStrokeSwipe",
            value: function getNextStrokeSwipe() {
                return this.stroke_history[this.cursor_position_history];
            } // Проверка активности кнопок назад, вперед

        }, {
            key: "checkNextLastButtons",
            value: function checkNextLastButtons() {
                var need_visible_buttons = false;

                if (this.pause === false && this.start === true) {
                    need_visible_buttons = true;
                }

                if (need_visible_buttons) {
                    $('[data-context="next_last_buttons"]').show();
                    var btn_next = $('[data-click="next_stroke"]');
                    var btn_last = $('[data-click="last_stroke"]'); // Проверяем есть ли что-то в истории

                    if (this.stroke_history.length > 0) {
                        btn_next.prop('disabled', false);
                        btn_last.prop('disabled', false);
                        if (typeof this.getLastStrokeSwipe() === 'undefined') btn_last.prop('disabled', true);
                        if (typeof this.getNextStrokeSwipe() === 'undefined') btn_next.prop('disabled', true);
                    } else {
                        btn_next.prop('disabled', true);
                        btn_last.prop('disabled', true);
                    }
                } else {
                    $('[data-context="next_last_buttons"]').hide();
                }

                return this;
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

            /**
             * Установить время в секундах
             * @param {number} time - время в секундах
             */
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
            } // Запустить таймер

        }, {
            key: "startTimer",
            value: function startTimer() {
                Timer.stopTimer();
                timer = setInterval(function () {
                    game.time++;
                    Timer.setTime(game.time); // Сохраняем данные

                    DataStorage.saveGameData(game);
                }, 1000);
            } // Остановить таймер

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
            key: "sendDataWithWrapper",
            // Отправить данные с оберткой
            value: function sendDataWithWrapper(data, name_method) {
                var not_to_json = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
                var params = new Array();
                params.push({
                    name: 'data[method]',
                    value: name_method
                });
                if (not_to_json === false) params.push({
                    name: 'data[data_game]',
                    value: JSON.stringify(data)
                });else params.push({
                    name: 'data[data_game]',
                    value: data
                }); // Время отправления запроса

                params.push({
                    name: 'data[time_request]',
                    value: $.now()
                });
                Request.sendRequest(params);
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

var DataStorage =
    /*#__PURE__*/
    function () {
        function DataStorage() {
            _classCallCheck(this, DataStorage);
        }

        _createClass(DataStorage, null, [{
            key: "saveGameData",
            // Сохраняем данные игры
            value: function saveGameData(object) {
                // Прикрепляем историю в объект
                object.dom_history = $('.history_stroke').html();
                localStorage.setItem('data_game', JSON.stringify(object));
            } // Загружаем данные игры

        }, {
            key: "loadGameData",
            value: function loadGameData() {
                var data = localStorage.getItem('data_game');

                if (data !== null) {
                    data = JSON.parse(data);

                    for (var key in game) {
                        if (typeof data[key] != 'undefined') {
                            game[key] = data[key];
                        }
                    }

                    $('.history_stroke').html(data.dom_history);
                } // Инциализация


                game.init();
            }
        }]);

        return DataStorage;
    }();

$(document).ready(function () {
    game = new Game(); // Загружаем данные в объект

    DataStorage.loadGameData();
    game.setButtons();
    $("body").keypress(function (event) {
        var keyCode = event.which;
        var result = false; // Регистрируем нажатие клавиш только если закрыто модальное окно

        if (!$('#modal_save_result').hasClass('show')) switch (keyCode) {
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
            // Проверяем выиграл ли пользователь (После каждого хода)
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
                game.addItemHistory('new_game');
                Timer.startTimer();
                break;

            case 'pause':
                game.pause = true;
                game.setButtons();
                game.addItemHistory('pause');
                Timer.stopTimer();
                break;

            case 'continue':
                game.pause = false;
                game.setButtons();
                Timer.startTimer();
                game.addItemHistory('continue');
                break;

            case 'scroll_down':
                $('html,body').stop().animate({
                    scrollTop: $('.buttons_field').offset().top
                }, 1000);
                break;

            case 'history':
                // Показываем панель истории и скроллим вниз
                $('.history_stroke').fadeToggle(300).scrollTop(document.querySelector('.history_stroke').scrollHeight); // Показываем блокирующий фон

                $('.block').fadeToggle(400);
                break;
            // Отменить,

            case 'last_stroke':
                var last_stroke = game.getLastStrokeSwipe();
                game.addItemHistory('last_stroke_rollback');
                game.cursor_position_history--;
                game.rollbackStroke(last_stroke);
                game.checkNextLastButtons();
                break;
            // Повторить

            case 'next_stroke':
                // Откат без инверсии
                game.rollbackStroke(game.getNextStrokeSwipe(), false);
                game.addItemHistory('next_stroke');
                game.cursor_position_history++;
                game.checkNextLastButtons();
                break;
            // Отправить данные формы

            case 'send_form_result':
                if ($('[name="name"]').val().length > 0 && $('[name="surname"]').val().length > 0) {
                    var params = $('[data-form="request_result_game"]').serializeArray(); // Отправляем данные на сервер

                    Request.sendDataWithWrapper(params, 'save_result', false); // Скрываем модалку

                    $('#modal_save_result').modal('hide');
                } else {
                    $('.error_form').html('Ошибка:<br>Заполните все данные!');
                }

                break;

            default:
                result = false;
                break;
        } // Сохраняем данные


        DataStorage.saveGameData(game);
    }); // Listener закрытия формы

    $("#modal_save_result").on("hide.bs.modal", function () {
        // Очищаем форму с ошибками
        $('.error_form').empty(); // Очищаем форму

        $('[data-form="request_result_game"] input').val(''); // Начинаем новую игру

        $('[data-click="new_game"]').trigger('click');
    }); // Свайпы

    $('[data-context="gesture_listener"]').swipe({
        swipeLeft: function swipeLeft() {
            game.handlerSwipe('left');
        },
        swipeRight: function swipeRight() {
            game.handlerSwipe('right');
        },
        swipeUp: function swipeUp() {
            game.handlerSwipe('up');
        },
        swipeDown: function swipeDown() {
            game.handlerSwipe('down');
        }
    });
});