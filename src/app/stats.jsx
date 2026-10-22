import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { getTasks } from '@/storage';



function generate_mock_tasks() {
    var tasks = [];
    var id = 1;
    var today = get_today_date(); 

    for (var days_ago = 0; days_ago < 30; days_ago = days_ago + 1) {
        // Сколько задач будет в этот день (от 2 до 4)
        var count_today = (days_ago % 3) + 2; 
        var task_date = get_date_days_ago(days_ago);

        for (var k = 0; k < count_today; k = k + 1) {
            var hour = 9 + (k * 4); // Время: 8:00, 12:00, 16:00, 20:00
            var hour_str = hour < 10 ? '0' + hour : String(hour);
            var task_time = hour_str + ':00';


            var is_done = false;
            
            if (task_date === today) {

                is_done = (k === 0);
            } else {

                is_done = (k % 3 !== 2) && (days_ago % 5 !== 0);
            }


            var current_priority = 'medium';
            if (id % 3 === 0) {
                current_priority = 'high';
            } else if (id % 3 === 1) {
                current_priority = 'low';
            }


            tasks.push({
                id: String(id),
                title: 'Задача №' + id + ' [' + current_priority.toUpperCase() + ']',
                date: task_date,
                time: task_time,
                done: is_done,
                priority: current_priority,
            });

            id = id + 1;
        }
    }

    return tasks;
}



function get_today_date() {
    var now = new Date();
    var iso_string = now.toISOString();
    return iso_string.slice(0, 10);
}

function get_date_days_ago(days) {
    var d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
}

function get_last_7_days_date() {
    var days = [];
    for (var i = 6; i >= 0; i = i - 1) {
        days.push(get_date_days_ago(i));
    }
    return days;
}



function filter_period_day_week_month(all_tasks, period) {
    var today = get_today_date();

    if (period === 'day') {
        return all_tasks.filter(function(task) {
            return task.date === today;
        });
    }

    if (period === 'week') {
        var week_ago = get_date_days_ago(7);
        return all_tasks.filter(function(task) {
            return task.date >= week_ago && task.date <= today;
        });
    }

    if (period === 'month') {
        var month_ago = get_date_days_ago(30);
        return all_tasks.filter(function(task) {
            return task.date >= month_ago && task.date <= today;
        });
    }

    return all_tasks;
}

function is_task_done(task) {
    return task.done === true;
}

function is_task_overdue(task) {
    var today = get_today_date();
    return task.done === false && task.date < today;
}

function count_done_on_date(all_tasks, date) {
    var count = 0;
    for (var i = 0; i < all_tasks.length; i = i + 1) {
        if (all_tasks[i].date === date && all_tasks[i].done === true) {
            count = count + 1;
        }
    }
    return count;
}

function get_max_value(numbers) {
    var max = 0;
    for (var i = 0; i < numbers.length; i = i + 1) {
        if (numbers[i] > max) {
            max = numbers[i];
        }
    }
    return max;
}



function get_hour(task) {
    if (task.time === '' || task.time === undefined) return -1;
    return Number(task.time.slice(0, 2));
}

function do_or_not(task, hour) {
    if (get_hour(task) === hour && task.done === true) {
        return true;
    } else {
        return false;
    }
}

function do_for_day(all_tasks, date_str) {
    var data = [];
    for (var j = 0; j < 24; j = j + 1) {
        data.push(0);
    }
    for (var i = 0; i < all_tasks.length; i = i + 1) {
        for (var j = 0; j < 24; j = j + 1) {
            if (all_tasks[i].date === date_str && do_or_not(all_tasks[i], j)) {
                data[j] = data[j] + 1;
            }
        }
    }
    return data;
}


function get_streak(all_tasks) {
    var streak = 0;
    for (var i = 0; i < 30; i = i + 1) {
        var date = get_date_days_ago(i);
        var has_done = false;
        for (var k = 0; k < all_tasks.length; k = k + 1) {
            if (all_tasks[k].date === date && all_tasks[k].done === true) {
                has_done = true;
            }
        }
        if (has_done === true) {
            streak = streak + 1;
        } else {
            break;    
        }
    }
    return streak;
}


function get_overdue_list(all_tasks, period) {
    var today = get_today_date();
    var start_date = today;
    if (period === 'week') start_date = get_date_days_ago(7);
    if (period === 'month') start_date = get_date_days_ago(30);

    var result = [];
    for (var i = 0; i < all_tasks.length; i = i + 1) {
        var t = all_tasks[i];
        if (t.done === false && t.date < today && t.date >= start_date) {
            result.push(t);
        }
    }
    return result;
}


function get_current_task(all_tasks) {
    var current_hour = new Date().getHours(); 
    var today = get_today_date();
    for (var i = 0; i < all_tasks.length; i = i + 1) {
        var task_hour = get_hour(all_tasks[i]);
        if (all_tasks[i].date === today && all_tasks[i].done === false && task_hour <= current_hour) {
            return all_tasks[i];
        }
    }
    return null;
}


function get_week_stats(all_tasks) {
    var weeks = [];
    var today = get_today_date();

    for (var j = 0; j < 4; j = j + 1) {
        var total = 0;
        var done = 0;
        var failed = 0;

        for (var i = 28 - (3 - j) * 7; i > j * 7; i = i - 1) {
            var date = get_date_days_ago(i);
            for (var k = 0; k < all_tasks.length; k = k + 1) {
                if (all_tasks[k].date === date) {
                    total = total + 1;
                    if (all_tasks[k].done === true) {
                        done = done + 1;
                    } else if (all_tasks[k].date < today) {
                        failed = failed + 1;
                    }
                }
            }
        }

        weeks.push({
            label: "Нед " + (j + 1),
            value: done,
            total: total,
            done: done,
            failed: failed,
        });
    }
    return weeks;
}


function Button_period(props) {
    var btn_style = [styles.periodBtn];
    if (props.active) {
        btn_style.push(styles.periodBtnActive);
    }

    var theme = useTheme();
    if (!props.active) {
        btn_style.push({ backgroundColor: theme.backgroundElement });
    }
    var text_color = props.active ? '#fff' : theme.text;

    return (
        <TouchableOpacity style={btn_style} onPress={props.onPress}>
            <ThemedText style={{ color: text_color }}>{props.label}</ThemedText>
        </TouchableOpacity>
    );
}

function Card_stat(props) {
    return (
        <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText style={styles.bigNumber}>{props.value}</ThemedText>
            <ThemedText themeColor="textSecondary">{props.label}</ThemedText>
        </ThemedView>
    );
}


function Progress_bar(props) {
    return (
        <ThemedView type="backgroundElement" style={styles.progressContainer}>
            <ThemedText>Прогресс: {props.value}%</ThemedText>
            <View style={styles.progressBg}>
                <View style={[styles.progressFill, { width: props.value + '%' }]} />
            </View>
        </ThemedView>
    );
}


function Streak_card(props) {
    return (
        <View style={styles.streakContainer}>
            <ThemedText style={styles.streakFire}>🔥</ThemedText>
            <ThemedText style={styles.bigNumber}>{props.value}</ThemedText>
            <ThemedText themeColor="textSecondary">дней подряд</ThemedText>
        </View>
    );
}


function Current_task_card(props) {
    if (props.task === null) {
        return (
            <ThemedView type="backgroundElement" style={styles.currentContainer}>
                <ThemedText style={styles.sectionTitle}>Текущая задача</ThemedText>
                <ThemedText themeColor="textSecondary">Всё выполнено! Молодец 🎉</ThemedText>
            </ThemedView>
        );
    }
    return (
        <ThemedView type="backgroundElement" style={styles.currentContainer}>
            <ThemedText style={styles.sectionTitle}>Текущая задача</ThemedText>
            <ThemedText>{props.task.title}</ThemedText>
            <ThemedText themeColor="textSecondary">в {props.task.time}</ThemedText>
        </ThemedView>
    );
}


function Overdue_list(props) {
    if (props.tasks.length === 0) {
        return (
            <ThemedView type="backgroundElement" style={styles.currentContainer}>
                <ThemedText style={styles.sectionTitle}>Просрочено</ThemedText>
                <ThemedText themeColor="textSecondary">Просроченных задач нет</ThemedText>
            </ThemedView>
        );
    }

    return (
        <ThemedView type="backgroundElement" style={styles.currentContainer}>
            <ThemedText style={styles.sectionTitle}>Просрочено: {props.tasks.length}</ThemedText>
            {props.tasks.map(function(task, index) {
                return (
                    <ThemedText key={index} style={styles.overdueItem}>
                        • {task.title} ({task.date})
                    </ThemedText>
                );
            })}
        </ThemedView>
    );
}


function Chart_bar(props) {
    var values = [];

    var current_hour_str = String(new Date().getHours()); 
    var current_day_num = String(new Date().getDate());    

    for (var i = 0; i < props.data.length; i = i + 1) {
        values.push(props.data[i].value);
    }
    var max_value = get_max_value(values);
    if (max_value === 0) {
        max_value = 1;
    }

    var bars = [];
    for (var i = 0; i < props.data.length; i = i + 1) {
        var day = props.data[i];
        var bar_height = (day.value / max_value) * 100;

        var bar_color = '#4a90e2';
        if (day.value === max_value && max_value > 0) {
            bar_color = '#4caf50';
        }

        var extra_text = '';
        if (day.total !== undefined) {
            extra_text = day.done + '/' + day.total + ' (провал ' + day.failed + ')';
        }

        var day = props.data[i];

        var is_current_spot = false;

        if (props.currentPeriod === 'day' && day.label === current_hour_str) {
            is_current_spot = true; 
        } 
        else if (props.currentPeriod === 'week' && day.isToday === true) {
            is_current_spot = true; 
        } 
        else if (props.currentPeriod === 'month') { // мб придумать что-то

        }

        bars.push(
            <View key={i} style={styles.barColumn}>
                <ThemedText style={styles.barValue}>{day.value}</ThemedText>
                
                {/* Мы тут, значит будет выделяться цветом */}
                <View style={[
                    styles.bar, 
                    { height: bar_height, backgroundColor: is_current_spot ? '#e67e22' : bar_color }
                ]} />
                
                {/* Тоже выделяем жирненьким */}
                <ThemedText style={[
                    styles.barLabel, 
                    is_current_spot && { fontWeight: 'bold', fontStyle: 'italic', color: '#e67e22' }
                ]}>
                    {day.label}
                </ThemedText>
            </View>
        );
    }

    return (
        <ThemedView type="backgroundElement" style={styles.chartContainer}>
            <ThemedText style={styles.sectionTitle}>Продуктивность</ThemedText>
            <View style={styles.chartRow}>{bars}</View>
        </ThemedView>
    );
}




export default function Screen_stats() {
    var tasks_state = useState([]);
    var tasks = tasks_state[0];
    var set_tasks = tasks_state[1];

    var period_state = useState('day');
    var period = period_state[0];
    var set_period = period_state[1];

    // Перечитываем задачи каждый раз, когда открываем вкладку
    useFocusEffect(useCallback(load_tasks, []));

    function load_tasks() {
        getTasks().then(handle_tasks_loaded);
    }

    function handle_tasks_loaded(data) {
        set_tasks(data);
    }

    function handle_day_press()   { set_period('day');   }
    function handle_week_press()  { set_period('week');  }
    function handle_month_press() { set_period('month'); }

    // --- Расчёты для карточек ---
    var tasks_for_period = filter_period_day_week_month(tasks, period);
    var count_all = tasks_for_period.length;
    var count_done = tasks_for_period.filter(is_task_done).length;

    var percent = 0;
    if (count_all > 0) {
        percent = Math.round((count_done / count_all) * 100);
    }

    var count_overdue = tasks_for_period.filter(is_task_overdue).length;


    var data_for_chart = [];
    if (period === 'day') {
        var hours_stats = do_for_day(tasks, get_today_date());
        for (var h = 9; h <= 22; h = h + 1) {
            data_for_chart.push({
                label: String(h),
                value: hours_stats[h],
            });
        }
    } else if (period === 'month') {
        data_for_chart = get_week_stats(tasks);
    } else {
        var last_7_days = get_last_7_days_date();
        for (var i = 0; i < last_7_days.length; i = i + 1) {
            var date_str = last_7_days[i]; 

            var check_today = (date_str === get_today_date()); 

            data_for_chart.push({
                label: get_day_name(date_str),
                value: count_done_on_date(tasks, date_str),
                isToday: check_today
            });
        }
    }


    var streak = get_streak(tasks);
    var overdue_list = get_overdue_list(tasks, period);
    var current_task = get_current_task(tasks);

    var temp_priority = [];
    temp_priority = count_done_by_priority(tasks_for_period);


    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <ScrollView contentContainerStyle={styles.scrollContent}>

                    <ThemedText style={styles.screenTitle}>Статистика</ThemedText>

                    <View style={styles.periodRow}>
                        <Button_period label="День"   active={period === 'day'}   onPress={handle_day_press}   />
                        <Button_period label="Неделя" active={period === 'week'}  onPress={handle_week_press}  />
                        <Button_period label="Месяц"  active={period === 'month'} onPress={handle_month_press} />
                    </View>

                    {count_all === 0 ? (
                        <ThemedView type="backgroundElement" style={styles.emptyContainer}>
                            <ThemedText style={styles.sectionTitle}>📭 Пока нет задач</ThemedText>
                            <ThemedText themeColor="textSecondary">За этот период ничего не запланировано</ThemedText>
                        </ThemedView>
                    ) : (
                        <View>
                            <View style={styles.cards}>
                                <Card_stat value={count_all}        label="всего"      />
                                <Card_stat value={count_done}       label="сделано"    />
                                <Card_stat value={percent + '%'}    label="процент"    />
                                <Card_stat value={count_overdue}    label="просрочено" />
                            </View>

                            <View style={styles.gap} />

                            <Progress_bar value={percent} />

                            <View style={styles.gap} />

                            <Streak_card value={streak} />

                            <View style={styles.gap} />

                            <Current_task_card task={current_task} />

                            <View style={styles.gap} />

                            <Chart_bar data={data_for_chart} currentPeriod={period}/>

                            <View style={styles.gap} />

                            <Priority_widget data={temp_priority} />

                            <View style={styles.gap} />

                            <Overdue_list tasks={overdue_list} />
                        </View>
                    )}

                </ScrollView>
            </SafeAreaView>
        </ThemedView>
    );
}



const styles = StyleSheet.create({
    container: { flex: 1 },
    safeArea: { flex: 1 },
    scrollContent: { padding: 16, gap: 16 },

    gap: { height: 16 },
    screenTitle: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
    sectionTitle: { fontSize: 18, lineHeight: 24, fontWeight: '700' },
    periodRow: { flexDirection: 'row', gap: 8 },
    periodBtn: {
        paddingHorizontal: 16, paddingVertical: 8,
        borderRadius: 8,
    },
    periodBtnActive: { backgroundColor: '#4a90e2' },

    cards: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    card: {
        width: '47%', padding: 16, borderRadius: 12,
        alignItems: 'center',
    },


    progressContainer: {
        padding: 16, borderRadius: 12,
        gap: 8,
    },
    progressBg: {
        width: '100%', height: 16,
        backgroundColor: 'rgba(128, 128, 128, 0.25)', borderRadius: 8,
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#4a90e2', borderRadius: 8,
    },


    streakContainer: {
        padding: 16, borderRadius: 12,
        backgroundColor: 'rgba(255, 152, 0, 0.15)', alignItems: 'center', gap: 4,
    },
    streakFire: { fontSize: 32, lineHeight: 40 },
    bigNumber: { fontSize: 32, lineHeight: 40, fontWeight: '700' },

    currentContainer: {
        padding: 16, borderRadius: 12,
        gap: 4,
    },
    overdueItem: { fontSize: 13, color: '#c0392b' },

    emptyContainer: {
        padding: 32, borderRadius: 12,
        alignItems: 'center', gap: 8,
    },

    chartContainer: {
        padding: 16, borderRadius: 12,
        gap: 12,
    },
    chartRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        height: 180,
    },
    barColumn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    bar: {
        width: 8,
        borderRadius: 4,
        minHeight: 2,
    },
    barValue: { fontSize: 10, marginBottom: 2 },
    barExtra: { fontSize: 8, color: '#888', marginBottom: 2 },
    barLabel: { fontSize: 10, marginTop: 4, color: '#888' },
});


function get_day_name(data_str) {
    let temp = new Date(data_str);
    let x = temp.getDay();
    switch(x){
        case 0: {
            return 'Вс';
        }
        case 1: {
            return 'Пн';
        }
        case 2: {
            return 'Вт';
        } 
        case 3: {
            return 'Ср';
        } 
        case 4: {
            return 'Чт';
        } 
        case 5: {
            return 'Пт';
        } 
        case 6: {
            return 'Сб';
        } 
    }
}


function count_done_by_priority(all_tasks) {
    var temp = [];
    for (let i = 0; i < 3; ++i) temp[i] = 0;
    for (let i = 0; i < all_tasks.length; ++i) {
        if (all_tasks[i].done === true){
            if (all_tasks[i].priority === 'low') temp[0] += 1;
            if (all_tasks[i].priority === 'medium') temp[1] += 1;
            if (all_tasks[i].priority === 'high') temp[2] += 1;
        }
    }
    return temp;
}

function Priority_widget(props) {
    var temp = [];
    var temp2 = [];
    temp = props.data;
    return (
            <ThemedView type="backgroundElement" style={{ padding: 16, borderRadius: 12, gap: 12 }}>
                <ThemedText style={styles.sectionTitle}>Приоритеты</ThemedText>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: 'green' }} />
                <ThemedText>Низкий приоритет, выполнено: {temp[0]}</ThemedText>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: 'orange' }} />
                <ThemedText>Средний приоритет, выполнено: {temp[1]}</ThemedText>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: 'red' }} />
                <ThemedText>Высокий приоритет, выполнено: {temp[2]}</ThemedText>
                </View>
            </ThemedView>
    );
}
