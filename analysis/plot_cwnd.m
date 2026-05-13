% plot_cwnd.m
% TCP Congestion Control — Automated Graph Generator
% Called by matlab_server.py via: matlab -batch "cd('...'); run('plot_cwnd.m')"
% Reads job.json written by matlab_server.py, saves PNGs to figures/

close all; clc;

FIGURES_DIR = fullfile(pwd, 'figures');
if ~exist(FIGURES_DIR, 'dir')
    mkdir(FIGURES_DIR);
end

JOB_FILE = fullfile(pwd, 'job.json');
if ~exist(JOB_FILE, 'file')
    error('job.json not found in %s', pwd);
end

job  = jsondecode(fileread(JOB_FILE));
mode = job.mode;

CYN  = [0.220 0.741 0.973];
ACC  = [0.976 0.451 0.086];
RED  = [0.85  0.20  0.20];
FONT = 'Helvetica';

PALETTE = [
    0.220 0.741 0.973;
    0.976 0.451 0.086;
    0.298 0.847 0.557;
    0.898 0.302 0.302;
    0.780 0.518 0.973;
    0.973 0.843 0.220;
    0.400 0.800 0.800;
];

function ax = styled_axes(fig_handle)
    ax = axes('Parent', fig_handle);
    set(ax, 'Color', [1 1 1], ...
            'XColor', [0.08 0.08 0.12], ...
            'YColor', [0.08 0.08 0.12], ...
            'GridColor', [0.88 0.88 0.88], ...
            'GridAlpha', 0.6, ...
            'Box', 'off', ...
            'FontSize', 11, ...
            'FontName', 'Helvetica');
    grid(ax, 'on');
    hold(ax, 'on');
end

function save_fig(fig_handle, figures_dir, name)
    set(fig_handle, 'Color', [1 1 1]);
    out = fullfile(figures_dir, [name '.png']);
    exportgraphics(fig_handle, out, 'Resolution', 150);
    fprintf('Saved: %s\n', out);
end

if strcmp(mode, 'single')

    variant  = job.variant;
    cwnd_raw = job.cwnd;
    metrics  = job.metrics;

    t    = arrayfun(@(x) x.time, cwnd_raw);
    cwnd = arrayfun(@(x) x.cwnd, cwnd_raw) / 1024;

    f1 = figure('Visible','off','Position',[100 100 800 400]);
    ax = styled_axes(f1);
    plot(ax, t, cwnd, 'Color', CYN, 'LineWidth', 1.8);
    xlabel(ax, 'Time (s)',               'FontName', FONT, 'FontSize', 12);
    ylabel(ax, 'Congestion Window (KB)', 'FontName', FONT, 'FontSize', 12);
    title(ax, sprintf('cwnd — %s', upper(variant)), 'FontName', FONT, 'FontSize', 14, 'FontWeight', 'bold');
    save_fig(f1, FIGURES_DIR, 'cwnd');

    f2 = figure('Visible','off','Position',[100 100 500 380]);
    ax = styled_axes(f2);
    b = bar(ax, 1, metrics.throughputMbps, 0.45);
    b.FaceColor = ACC; b.EdgeColor = 'none';
    set(ax, 'XTick', 1, 'XTickLabel', {upper(variant)});
    ylabel(ax, 'Throughput (Mbps)', 'FontName', FONT, 'FontSize', 12);
    title(ax, 'Throughput', 'FontName', FONT, 'FontSize', 14, 'FontWeight', 'bold');
    save_fig(f2, FIGURES_DIR, 'throughput');

    f3 = figure('Visible','off','Position',[100 100 500 380]);
    ax = styled_axes(f3);
    b = bar(ax, 1, metrics.avgDelayMs, 0.45);
    b.FaceColor = CYN; b.EdgeColor = 'none';
    set(ax, 'XTick', 1, 'XTickLabel', {upper(variant)});
    ylabel(ax, 'Avg Delay (ms)', 'FontName', FONT, 'FontSize', 12);
    title(ax, 'Average Delay', 'FontName', FONT, 'FontSize', 14, 'FontWeight', 'bold');
    save_fig(f3, FIGURES_DIR, 'delay');

    f4 = figure('Visible','off','Position',[100 100 500 380]);
    ax = styled_axes(f4);
    b = bar(ax, 1, metrics.lossRate * 100, 0.45);
    b.FaceColor = RED; b.EdgeColor = 'none';
    set(ax, 'XTick', 1, 'XTickLabel', {upper(variant)});
    ylabel(ax, 'Packet Loss (%)', 'FontName', FONT, 'FontSize', 12);
    title(ax, 'Packet Loss Rate', 'FontName', FONT, 'FontSize', 14, 'FontWeight', 'bold');
    save_fig(f4, FIGURES_DIR, 'loss');

elseif strcmp(mode, 'compare')

    variants = job.variants;
    n = numel(variants);

    labels      = cell(1, n);
    throughputs = zeros(1, n);
    delays      = zeros(1, n);
    losses      = zeros(1, n);

    f1 = figure('Visible','off','Position',[100 100 900 450]);
    ax = styled_axes(f1);

    for i = 1:n
        v    = variants(i);
        t    = arrayfun(@(x) x.time, v.cwnd);
        cwnd = arrayfun(@(x) x.cwnd, v.cwnd) / 1024;
        col  = PALETTE(mod(i-1, size(PALETTE,1))+1, :);
        plot(ax, t, cwnd, 'Color', col, 'LineWidth', 1.8, 'DisplayName', upper(v.variant));
        labels{i}      = upper(v.variant);
        throughputs(i) = v.metrics.throughputMbps;
        delays(i)      = v.metrics.avgDelayMs;
        losses(i)      = v.metrics.lossRate * 100;
    end

    legend(ax, 'Location', 'best', 'FontSize', 10);
    xlabel(ax, 'Time (s)',               'FontName', FONT, 'FontSize', 12);
    ylabel(ax, 'Congestion Window (KB)', 'FontName', FONT, 'FontSize', 12);
    title(ax, 'cwnd Comparison',         'FontName', FONT, 'FontSize', 14, 'FontWeight', 'bold');
    save_fig(f1, FIGURES_DIR, 'cwnd');

    cats = categorical(labels, labels);

    f2 = figure('Visible','off','Position',[100 100 600 420]);
    ax = styled_axes(f2);
    b = bar(ax, cats, throughputs, 0.55);
    b.FaceColor = 'flat'; b.EdgeColor = 'none';
    for i = 1:n; b.CData(i,:) = PALETTE(mod(i-1,size(PALETTE,1))+1,:); end
    ylabel(ax, 'Throughput (Mbps)',     'FontName', FONT, 'FontSize', 12);
    title(ax, 'Throughput Comparison',  'FontName', FONT, 'FontSize', 14, 'FontWeight', 'bold');
    save_fig(f2, FIGURES_DIR, 'throughput');

    f3 = figure('Visible','off','Position',[100 100 600 420]);
    ax = styled_axes(f3);
    b = bar(ax, cats, delays, 0.55);
    b.FaceColor = 'flat'; b.EdgeColor = 'none';
    for i = 1:n; b.CData(i,:) = PALETTE(mod(i-1,size(PALETTE,1))+1,:); end
    ylabel(ax, 'Avg Delay (ms)',    'FontName', FONT, 'FontSize', 12);
    title(ax, 'Delay Comparison',   'FontName', FONT, 'FontSize', 14, 'FontWeight', 'bold');
    save_fig(f3, FIGURES_DIR, 'delay');

    f4 = figure('Visible','off','Position',[100 100 600 420]);
    ax = styled_axes(f4);
    b = bar(ax, cats, losses, 0.55);
    b.FaceColor = 'flat'; b.EdgeColor = 'none';
    for i = 1:n; b.CData(i,:) = PALETTE(mod(i-1,size(PALETTE,1))+1,:); end
    ylabel(ax, 'Packet Loss (%)',        'FontName', FONT, 'FontSize', 12);
    title(ax, 'Packet Loss Comparison',  'FontName', FONT, 'FontSize', 14, 'FontWeight', 'bold');
    save_fig(f4, FIGURES_DIR, 'loss');

else
    error('Unknown mode: %s', mode);
end

fprintf('plot_cwnd.m done — 4 figures saved.\n');